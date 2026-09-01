import { google } from '@ai-sdk/google';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { embedMany } from 'ai';
import { asc, cosineDistance, eq, lte } from 'drizzle-orm';
import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import env from '../config/env';
import db from '../db/connection';
import { courseFiles, courses, documentEmbeddings } from '../db/schema';

export async function generateChunks(text: string, chunkSize: number = 4000, chunkOverlap: number = 400) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
    });

    return await splitter.splitText(text);
}

export async function extractTextFromPdf(filepath: string): Promise<string> {
    const pdf = await fs.readFile(filepath);
    const parser = new PDFParse({ data: pdf });

    try {
        const result = await parser.getText();
        const text = result.text;

        if (!text) throw new Error("Failed to extract text from PDF");

        return text;
    } finally {
        await parser.destroy();
    }
}

export async function extractTextFromDocx(filepath: string): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ path: filepath });
        const text = result.value;

        if (!text) throw new Error("Failed to extract text from DOCX");

        return text;
    } catch (error) {
        console.error("Error extracting text from DOCX:", error);
        throw new Error("Failed to extract text from DOCX");
    }
}

export async function generateEmbeddings(texts: string[]) {
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const { embeddings } = await embedMany({
            model: google.embeddingModel(env.TEXT_EMBEDDING_MODEL),
            values: batch,
        });
        allEmbeddings.push(...embeddings);
    }

    return allEmbeddings;
}

type ChunksStorageType = {
    chunks: string[];
    embeddings: number[][];
    fileId: string;
}

export async function storeEmbeddingsIntoDB({ chunks, embeddings, fileId }: ChunksStorageType) {
    const records = chunks.map((chunk, index) => ({
        chunkText: chunk,
        embedding: embeddings[index],
        fileId,
    }));

    return await db.insert(documentEmbeddings).values(records);
}

export async function getEmbeddingsByFile(fileId: string) {
    return await db
        .select()
        .from(documentEmbeddings)
        .where(eq(documentEmbeddings.fileId, fileId))
        .orderBy(asc(documentEmbeddings.createdAt));
}

export async function deleteEmbeddingsByFile(fileId: string) {
    return await db.delete(documentEmbeddings).where(eq(documentEmbeddings.fileId, fileId));
}

// Delete all embeddings belonging to a user's files (via course ownership join).
export async function deleteEmbeddingsByUser(userId: string) {
    // Subquery: get all file IDs owned by this user
    const userFileIds = await db
        .select({ id: courseFiles.id })
        .from(courseFiles)
        .innerJoin(courses, eq(courses.id, courseFiles.courseId))
        .where(eq(courses.userId, userId));

    if (userFileIds.length === 0) return;

    for (const { id } of userFileIds) {
        await db.delete(documentEmbeddings).where(eq(documentEmbeddings.fileId, id));
    }
}

// Semantic search scoped to a user's files via course ownership join.
export async function semanticSearch({ query, userId, limit }: { query: string; userId: string; limit?: number }) {
    const queryEmbed = await generateEmbeddings([query]);
    const targetVector = queryEmbed[0];

    // Get all file IDs owned by this user
    const userFileIds = await db
        .select({ id: courseFiles.id })
        .from(courseFiles)
        .innerJoin(courses, eq(courses.id, courseFiles.courseId))
        .where(eq(courses.userId, userId));

    if (userFileIds.length === 0) return [];

    const result = await db
        .select({
            id:        documentEmbeddings.id,
            chunkText: documentEmbeddings.chunkText,
            embedding: documentEmbeddings.embedding,
            fileId:    documentEmbeddings.fileId,
            courseFile: {
                id:           courseFiles.id,
                originalName: courseFiles.originalName,
                createdAt:    courseFiles.createdAt,
            },
        })
        .from(documentEmbeddings)
        .innerJoin(courseFiles, eq(courseFiles.id, documentEmbeddings.fileId))
        .innerJoin(courses, eq(courses.id, courseFiles.courseId))
        .where(
            lte(cosineDistance(documentEmbeddings.embedding, targetVector), 1 - 0.6)
        )
        .orderBy(asc(cosineDistance(documentEmbeddings.embedding, targetVector)))
        .limit(limit ?? 5);

    // Filter to only the current user's results (the join already scopes this, but we add an explicit userId check for safety)
    return result.filter(r =>
        userFileIds.some(f => f.id === r.fileId)
    );
}
