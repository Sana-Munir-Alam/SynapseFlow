import type { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { completeFlashcardSession, getCourseById, getCourseCounts, getCoursesByUser, getFileByCourse, getFileById, getFilesByCourse, getFlashcardsByCourse, getMcqById, getMcqsByCourse, insertCourse, insertFile, insertFlashcard, insertFlashcardSession, insertMcqAttempt, insertMcqWithOptions, removeCourse, removeFile, replaceFlashcardContent, replaceMcqContent, updateCourse, deleteMcqOnly, deleteFlashcardOnly, touchCourse } from '../services/dal/notes.dal'
import { deleteEmbeddingsByFile, extractTextFromPdf, extractTextFromDocx, generateChunks, generateEmbeddings, storeEmbeddingsIntoDB } from '../utils/rag.utils'
import { extractTextFromFile, generateFlashcardsFromText, generateMcqsFromText } from '../services/handlers/ai-notes'
import { emitProgressStale } from '../lib/emitProgressStale'

// ---- Helpers --------------------------------------------------------------

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// ---- Courses --------------------------------------------------------------

export const getCourses = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const userCourses = await getCoursesByUser(userId)

        // 3 queries total: 1 to get file counts, 1 to get flashcard counts, 1 to get mcq counts 
        const { fileMap, flashcardMap, mcqMap } = await getCourseCounts(userId)

        const coursesWithCounts = userCourses.map((course) => ({
            ...course,
            filesCount:      fileMap[course.id]      ?? 0, // if no files for this course, default to 0
            flashcardsCount: flashcardMap[course.id] ?? 0,
            mcqsCount:       mcqMap[course.id]       ?? 0,
        }))

        return res.status(200).json(coursesWithCounts)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to fetch courses' })
    }
}

export const createCourse = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const { name } = req.body

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Course name is required' })
        }

        const course = await insertCourse({
            userId,
            name: name.trim(),
        })

        emitProgressStale(userId)
        
        return res.status(201).json({ ...course, filesCount: 0, flashcardsCount: 0, mcqsCount: 0 })
    } catch (err: any) {
        if (err?.cause?.code === '23505') {
            return res.status(409).json({ message: 'You already have a course with this name' })
        }
        console.error(err)
        return res.status(500).json({ message: 'Failed to create course' })
    }
}

export const deleteCourse = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const courseId = req.params.courseId as string

        // ── Delete physical files from disk before removing DB row ──
        const files = await getFilesByCourse(courseId, userId)
        for (const file of files) {
            const fullPath = path.join(process.cwd(), file.storagePath)
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
        }

        const deleted = await removeCourse(courseId, userId)
        if (!deleted) return res.status(404).json({ message: 'Course not found' })

        emitProgressStale(userId)

        return res.status(200).json({ message: 'Course deleted' })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to delete course' })
    }
}

export const renameCourse = async (req: Request, res: Response) => {
    try {
        const userId   = req.user!.id
        const courseId = req.params.courseId as string
        const { name } = req.body

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Course name is required' })
        }

        const updated = await updateCourse(courseId, userId, { name: name.trim() })
        if (!updated) return res.status(404).json({ message: 'Course not found' })

        return res.status(200).json(updated)
    } catch (err: any) {
        if (err?.cause?.code === '23505') {
            return res.status(409).json({ message: 'You already have a course with this name' })
        }
        console.error(err)
        return res.status(500).json({ message: 'Failed to rename course' })
    }
}

// ---- Files ----------------------------------------------------------------

export const getFiles = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const courseId = req.params.courseId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })

        const files = await getFilesByCourse(courseId, userId)
        return res.status(200).json(files)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to fetch files' })
    }
}

export const getFile = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const courseId = req.params.courseId as string
        const fileId = req.params.fileId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })

        const [file] = await getFileByCourse(fileId, courseId, userId)
        if (!file) return res.status(404).json({ message: 'File not found' })

        return res.status(200).json(file)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to fetch file' })
    }
}

export const uploadFile = async (req: Request, res: Response) => {
    const multerFile = (req as any).file
    if (!multerFile) return res.status(400).json({ message: 'No file uploaded' })
        
    try {
        const userId = req.user!.id
        const courseId = req.params.courseId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })


                const file = await insertFile({
            courseId,
            originalName: multerFile.originalname,
            storagePath:  `/uploads/${multerFile.filename}`,
            mimeType:     multerFile.mimetype,
            sizeBytes:    multerFile.size,
        })

        const fullFilePath = path.join(process.cwd(), 'uploads', multerFile.filename);
        
        let text = '';
        if (multerFile.mimetype === 'application/pdf') {
            text = await extractTextFromPdf(fullFilePath);
        } else if (
            multerFile.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
            multerFile.originalname.toLowerCase().endsWith('.docx')
        ) {
            text = await extractTextFromDocx(fullFilePath);
        } else {
            throw new Error("Unsupported file format for extraction");
        }
        const chunks = await generateChunks(text)

        console.log("CHUNKS LENGTH: ", chunks.length);
        
        const embeddings = await generateEmbeddings(chunks);

        await storeEmbeddingsIntoDB({ chunks, embeddings, fileId: file.id });

        console.log("EMBEDDINGS STORED SUCCESSFULLY");

        await touchCourse(courseId, userId)

        emitProgressStale(userId)

        return res.status(201).json(file)
    } catch (err) {
        console.error(err)
        fs.unlinkSync(path.join(process.cwd(), 'uploads', multerFile.filename))
        return res.status(500).json({ message: 'Failed to upload file' })
    }
}

export const downloadFile = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const fileId = req.params.fileId as string

        const file = await getFileById(fileId, userId)
        if (!file) return res.status(404).json({ message: 'File not found' })

        const fullPath = path.join(process.cwd(), file.storagePath)
        if (!fs.existsSync(fullPath)) return res.status(404).json({ message: 'File missing from storage' })

        return res.download(fullPath, file.originalName)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to download file' })
    }
}

export const previewFile = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const fileId = req.params.fileId as string

        const file = await getFileById(fileId, userId)
        if (!file) return res.status(404).json({ message: 'File not found' })

        const fullPath = path.join(process.cwd(), file.storagePath)
        if (!fs.existsSync(fullPath)) return res.status(404).json({ message: 'File missing from storage' })

        res.setHeader('Content-Type', file.mimeType)
        res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`)

        return res.sendFile(fullPath)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to preview file' })
    }
}

export const deleteFile = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const fileId = req.params.fileId as string

        const file = await getFileById(fileId, userId)
        if (!file) return res.status(404).json({ message: 'File not found' })

        const fullPath = path.join(process.cwd(), file.storagePath)
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)

        await removeFile(fileId, userId)
        await deleteEmbeddingsByFile(fileId)

        await touchCourse(file.courseId, userId)

        emitProgressStale(userId)

        return res.status(200).json({ message: 'File deleted' })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to delete file' })
    }
}

// ---- Flashcards -----------------------------------------------------------
// Cards are fetched and displayed in flip mode. 

export const getFlashcards = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const courseId = req.params.courseId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })

        const cards = await getFlashcardsByCourse(courseId, userId)
        return res.status(200).json(cards)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to fetch flashcards' })
    }
}

// Helper: distribute `total` items across `n` buckets (first buckets get remainder)
const distribute = (total: number, n: number) => {
    const base = Math.floor(total / n)
    let rem = total % n
    return Array.from({ length: n }, () => (rem > 0 ? (rem--, base + 1) : base))
}

// ---- Process Files --------------------------------------------------------
// Called by the "Process Files" button.
// Dirty detection: course.updatedAt is bumped on every file add/delete.
// If course.updatedAt > max(flashcard.updatedAt) — or no cards exist — files have changed.
// If nothing changed → return alreadyProcessed: true so frontend shows "Study Again"/"Start Test".
export const processFiles = async (req: Request, res: Response) => {
    try {
        const userId   = req.user!.id
        const courseId = req.params.courseId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })

        const files = await getFilesByCourse(courseId, userId)

        // Determine staleness: compare course.updatedAt against the most recently
        // updated flashcard. If all cards were generated after the last file change,
        // nothing needs to happen.
        const existingCardsForCheck = await getFlashcardsByCourse(courseId, userId)
        const lastCardUpdate = existingCardsForCheck.length > 0
            ? Math.max(...existingCardsForCheck.map(c => new Date(c.updatedAt).getTime()))
            : 0
        const courseUpdatedAt = new Date(course.updatedAt).getTime()
        const isDirty = existingCardsForCheck.length === 0 || courseUpdatedAt > lastCardUpdate

        if (!isDirty) return res.status(200).json({ alreadyProcessed: true })
        

        if (files.length === 0) return res.status(200).json({ alreadyProcessed: false, flashcards: [], mcqs: [] })

        const texts: { fileId: string; text: string }[] = []
        for (const file of files) {
            try {
                const text = await extractTextFromFile(file.storagePath, file.mimeType, file.originalName)
                texts.push({ fileId: file.id, text })
            } catch (_) { /* skip unsupported */ }
        }
        if (texts.length === 0) return res.status(400).json({ message: 'No supported files (PDF/DOCX) found for processing' })
        

        // ── Flashcards (preserve sessions) ──────────────────────────────────
        const existingCards = await getFlashcardsByCourse(courseId, userId)
        let flashcardsResult: any[]

        if (existingCards.length > 0) {
            const counts = distribute(existingCards.length, texts.length)
            const generatedPerFile = await Promise.all(
                texts.map(({ fileId, text }, i) =>
                    counts[i] > 0 ? generateFlashcardsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
                )
            )
            const allCards = generatedPerFile.flatMap(g => g.arr.map(c => ({ ...c, sourceFileId: g.fileId })))
            const newCards = allCards.slice(0, existingCards.length)
            flashcardsResult = await Promise.all(
                existingCards.map((card, i) =>
                    replaceFlashcardContent(card.id, userId, {
                        question:     newCards[i]?.question     ?? newCards[0].question,
                        answer:       newCards[i]?.answer       ?? newCards[0].answer,
                        sourceFileId: newCards[i]?.sourceFileId ?? newCards[0].sourceFileId ?? null,
                    })
                )
            )
        } else {
            const counts = distribute(5, texts.length)
            const generatedPerFile = await Promise.all(
                texts.map(({ fileId, text }, i) =>
                    counts[i] > 0 ? generateFlashcardsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
                )
            )
            const allCards = generatedPerFile.flatMap(g => g.arr.map(c => ({ ...c, sourceFileId: g.fileId })))
            flashcardsResult = await Promise.all(
                allCards.slice(0, 5).map(c =>
                    insertFlashcard({ courseId, question: c.question, answer: c.answer, aiGenerated: true, sourceFileId: c.sourceFileId })
                )
            )
        }

        // ── MCQs (preserve attempts via in-place replace) ────────────────────
        const existingMcqs = await getMcqsByCourse(courseId, userId)
        let mcqsResult: any[]

        if (existingMcqs.length > 0) {
            const counts = distribute(existingMcqs.length, texts.length)
            const generatedPerFile = await Promise.all(
                texts.map(({ fileId, text }, i) =>
                    counts[i] > 0 ? generateMcqsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
                )
            )
            const allQuestions = generatedPerFile.flatMap(g => g.arr.map(q => ({ ...q, sourceFileId: g.fileId })))
            const newQuestions  = allQuestions.slice(0, existingMcqs.length)
            mcqsResult = await Promise.all(
                existingMcqs.map((mcq, i) =>
                    replaceMcqContent(mcq.id, userId, {
                        question:      newQuestions[i]?.question      ?? newQuestions[0].question,
                        options:       newQuestions[i]?.options       ?? newQuestions[0].options,
                        correctOption: newQuestions[i]?.correctOption ?? newQuestions[0].correctOption,
                        explanation:   newQuestions[i]?.explanation   ?? newQuestions[0].explanation ?? null,
                        difficulty:    newQuestions[i]?.difficulty    ?? newQuestions[0].difficulty ?? 'medium',
                        sourceFileId:  newQuestions[i]?.sourceFileId  ?? newQuestions[0].sourceFileId ?? null,
                    })
                )
            )
        } else {
            const counts = distribute(5, texts.length)
            const generatedPerFile = await Promise.all(
                texts.map(({ fileId, text }, i) =>
                    counts[i] > 0 ? generateMcqsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
                )
            )
            const allQuestions = generatedPerFile.flatMap(g => g.arr.map(q => ({ ...q, sourceFileId: g.fileId })))
            mcqsResult = await Promise.all(
                allQuestions.slice(0, 5).map(q =>
                    insertMcqWithOptions({ courseId, question: q.question, options: q.options, correctOption: q.correctOption, explanation: q.explanation ?? null, difficulty: q.difficulty ?? 'medium', aiGenerated: true, sourceFileId: q.sourceFileId })
                )
            )
        }

        return res.status(200).json({ alreadyProcessed: false, flashcards: flashcardsResult, mcqs: mcqsResult })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to process files' })
    }
}

// AI-powered: generates flashcards from all uploaded files in the course.
export const generateFlashcards = async (req: Request, res: Response) => {
    try {
        const userId   = req.user!.id
        const courseId = req.params.courseId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })

        const files = await getFilesByCourse(courseId, userId)
        if (files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded to this course' })
        }

        // Extract text per-file and request 5 cards total distributed across files
        const texts: { fileId: string; text: string }[] = []
        for (const file of files) {
            try {
                const text = await extractTextFromFile(file.storagePath, file.mimeType, file.originalName)
                texts.push({ fileId: file.id, text })
            } catch (_) { /* skip unsupported files */ }
        }

        if (texts.length === 0) return res.status(400).json({ message: 'No supported files (PDF/DOCX) found for processing' })

        // Delete ALL existing flashcards for this course (preserve sessions/attempts)
        const existingCards = await getFlashcardsByCourse(courseId, userId)
        for (const card of existingCards) {
            await deleteFlashcardOnly(card.id, userId)
        }

        const counts = distribute(5, texts.length)
        const generatedPerFile = await Promise.all(
            texts.map(({ fileId, text }, i) =>
                counts[i] > 0 ? generateFlashcardsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
            )
        )

        const allCards = generatedPerFile.flatMap(g => g.arr.map(c => ({ ...c, sourceFileId: g.fileId })))
        const trimmed = allCards.slice(0, 5)

        const inserted = await Promise.all(
            trimmed.map(c =>
                insertFlashcard({ courseId, question: c.question, answer: c.answer, aiGenerated: true, sourceFileId: c.sourceFileId })
            )
        )

        return res.status(201).json(inserted)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to generate flashcards' })
    }
}


// AI-powered regenerate — replaces content of existing cards in-place (updates updated_at).
export const regenerateFlashcards = async (req: Request, res: Response) => {
    try {
        const userId   = req.user!.id
        const courseId = req.params.courseId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })

        const files = await getFilesByCourse(courseId, userId)
        if (files.length === 0) return res.status(400).json({ message: 'No files uploaded to this course' })

        const texts: { fileId: string; text: string }[] = []
        for (const file of files) {
            try {
                const text = await extractTextFromFile(file.storagePath, file.mimeType, file.originalName)
                texts.push({ fileId: file.id, text })
            } catch (_) {}
        }
        if (texts.length === 0) return res.status(400).json({ message: 'No supported files (PDF/DOCX) found for processing' })

        const existing = await getFlashcardsByCourse(courseId, userId)

        if (existing.length === 0) {
            // No existing cards -> create 5 new distributed across files
            const counts = distribute(5, texts.length)
            const generatedPerFile = await Promise.all(
                texts.map(({ fileId, text }, i) =>
                    counts[i] > 0 ? generateFlashcardsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
                )
            )
            const allCards = generatedPerFile.flatMap(g => g.arr.map(c => ({ ...c, sourceFileId: g.fileId })))
            const trimmed = allCards.slice(0, 5)
            const inserted = await Promise.all(
                trimmed.map(c => insertFlashcard({ courseId, question: c.question, answer: c.answer, aiGenerated: true, sourceFileId: c.sourceFileId }))
            )
            return res.status(201).json(inserted)
        }

        // Existing cards -> generate same number and replace content in-place
        const counts = distribute(existing.length, texts.length)
        const generatedPerFile = await Promise.all(
            texts.map(({ fileId, text }, i) =>
                counts[i] > 0 ? generateFlashcardsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
            )
        )
        const allCards = generatedPerFile.flatMap(g => g.arr.map(c => ({ ...c, sourceFileId: g.fileId })))
        const newCards = allCards.slice(0, existing.length)

        const updated = await Promise.all(
            existing.map((card, i) =>
                replaceFlashcardContent(card.id, userId, {
                    question:     newCards[i]?.question ?? newCards[0].question,
                    answer:       newCards[i]?.answer   ?? newCards[0].answer,
                    sourceFileId: newCards[i]?.sourceFileId ?? newCards[0].sourceFileId ?? null,
                })
            )
        )

        return res.status(200).json(updated)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to regenerate flashcards' })
    }
}

// AI-powered: generates MCQs from all uploaded files in the course.
// Also acts as the MCQ "process files" handler: returns { alreadyProcessed: true }
// when no file changes have occurred since last generation.
export const generateMcqs = async (req: Request, res: Response) => {
    try {
        const userId   = req.user!.id
        const courseId = req.params.courseId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })

        const existingMcqs = await getMcqsByCourse(courseId, userId)

        // Dirty check: if MCQs exist and all were generated after the last file change, skip.
        if (existingMcqs.length > 0) {
            const lastMcqUpdate = Math.max(...existingMcqs.map(m => new Date(m.updatedAt).getTime()))
            const courseUpdatedAt = new Date(course.updatedAt).getTime()
            if (courseUpdatedAt <= lastMcqUpdate) {
                return res.status(200).json({ alreadyProcessed: true })
            }
        }

        const files = await getFilesByCourse(courseId, userId)
        if (files.length === 0) return res.status(400).json({ message: 'No files uploaded to this course' })

        const texts: { fileId: string; text: string }[] = []
        for (const file of files) {
            try {
                const text = await extractTextFromFile(file.storagePath, file.mimeType, file.originalName)
                texts.push({ fileId: file.id, text })
            } catch (_) {}
        }

        if (texts.length === 0) return res.status(400).json({ message: 'No supported files (PDF/DOCX) found for processing' })

        if (existingMcqs.length > 0) {
            // MCQs already exist — replace content in-place to preserve attempt history
            const counts = distribute(existingMcqs.length, texts.length)
            const generatedPerFile = await Promise.all(
                texts.map(({ fileId, text }, i) =>
                    counts[i] > 0 ? generateMcqsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
                )
            )
            const allQuestions = generatedPerFile.flatMap(g => g.arr.map(q => ({ ...q, sourceFileId: g.fileId })))
            const newQuestions = allQuestions.slice(0, existingMcqs.length)

            const updated = await Promise.all(
                existingMcqs.map((mcq, i) =>
                    replaceMcqContent(mcq.id, userId, {
                        question:      newQuestions[i]?.question      ?? newQuestions[0].question,
                        options:       newQuestions[i]?.options       ?? newQuestions[0].options,
                        correctOption: newQuestions[i]?.correctOption ?? newQuestions[0].correctOption,
                        explanation:   newQuestions[i]?.explanation   ?? newQuestions[0].explanation ?? null,
                        difficulty:    newQuestions[i]?.difficulty    ?? newQuestions[0].difficulty ?? 'medium',
                        sourceFileId:  newQuestions[i]?.sourceFileId  ?? newQuestions[0].sourceFileId ?? null,
                    })
                )
            )
            return res.status(200).json(updated)
        }

        // No existing MCQs — generate 5 fresh ones
        const counts = distribute(5, texts.length)
        const generatedPerFile = await Promise.all(
            texts.map(({ fileId, text }, i) =>
                counts[i] > 0 ? generateMcqsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
            )
        )

        const allQuestions = generatedPerFile.flatMap(g => g.arr.map(q => ({ ...q, sourceFileId: g.fileId })))
        const trimmed = allQuestions.slice(0, 5)

        const inserted = await Promise.all(
            trimmed.map(q =>
                insertMcqWithOptions({
                        courseId, question: q.question, options: q.options, correctOption: q.correctOption, explanation: q.explanation ?? null,
                    difficulty: q.difficulty ?? 'medium', aiGenerated: true, sourceFileId: q.sourceFileId,
                })
            )
        )

        return res.status(201).json(inserted)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to generate MCQs' })
    }
}

// AI-powered regenerate — replaces MCQs content in-place (updates updated_at).
export const regenerateMcqs = async (req: Request, res: Response) => {
    try {
        const userId   = req.user!.id
        const courseId = req.params.courseId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })

        const files = await getFilesByCourse(courseId, userId)
        if (files.length === 0) return res.status(400).json({ message: 'No files uploaded to this course' })

        const texts: { fileId: string; text: string }[] = []
        for (const file of files) {
            try {
                const text = await extractTextFromFile(file.storagePath, file.mimeType, file.originalName)
                texts.push({ fileId: file.id, text })
            } catch (_) {}
        }
        if (texts.length === 0) return res.status(400).json({ message: 'No supported files (PDF/DOCX) found for processing' })

        const existing = await getMcqsByCourse(courseId, userId)

        if (existing.length === 0) {
            // No existing MCQs -> create 5 new distributed across files
            const counts = distribute(5, texts.length)
            const generatedPerFile = await Promise.all(
                texts.map(({ fileId, text }, i) =>
                    counts[i] > 0 ? generateMcqsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
                )
            )
            const allQuestions = generatedPerFile.flatMap(g => g.arr.map(q => ({ ...q, sourceFileId: g.fileId })))
            const trimmed = allQuestions.slice(0, 5)
            const inserted = await Promise.all(
                trimmed.map(q =>
                    insertMcqWithOptions({ courseId, question: q.question, options: q.options, correctOption: q.correctOption,
                        explanation: q.explanation ?? null, difficulty: q.difficulty ?? 'medium', aiGenerated: true, sourceFileId: q.sourceFileId,
                    })
                )
            )
            return res.status(201).json(inserted)
        }

        // Existing MCQs -> generate same number and replace content in-place
        const counts = distribute(existing.length, texts.length)
        const generatedPerFile = await Promise.all(
            texts.map(({ fileId, text }, i) =>
                counts[i] > 0 ? generateMcqsFromText(text, counts[i]).then(arr => ({ fileId, arr })) : Promise.resolve({ fileId, arr: [] })
            )
        )
        const allQuestions = generatedPerFile.flatMap(g => g.arr.map(q => ({ ...q, sourceFileId: g.fileId })))
        const newQuestions = allQuestions.slice(0, existing.length)
        
const updated = await Promise.all(
    existing.map((mcq, i) =>
        replaceMcqContent(mcq.id, userId, {
            question:      newQuestions[i]?.question      ?? newQuestions[0].question,
            options:       newQuestions[i]?.options       ?? newQuestions[0].options,
            correctOption: newQuestions[i]?.correctOption ?? newQuestions[0].correctOption,
            explanation:   newQuestions[i]?.explanation   ?? newQuestions[0].explanation ?? null,
            difficulty:    newQuestions[i]?.difficulty    ?? newQuestions[0].difficulty ?? 'medium',
            sourceFileId:  newQuestions[i]?.sourceFileId  ?? newQuestions[0].sourceFileId  ?? null,
        })
    )
)
        return res.status(200).json(updated)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to regenerate MCQs' })
    }
}

// ---- Flashcard Sessions ---------------------------------------------------
// Called when user opens the flashcards tab and starts a new session.
export const startFlashcardSession = async (req: Request, res: Response) => {
    try {
        const userId   = req.user!.id
        const courseId = req.params.courseId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })

        const session = await insertFlashcardSession({ userId, courseId })
        return res.status(201).json(session)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to start session' })
    }
}

// Called when user finishes all cards — finalises the session with counts.
export const finishFlashcardSession = async (req: Request, res: Response) => {
    try {
        const userId    = req.user!.id
        const sessionId = req.params.sessionId as string
        const { familiarCount, unfamiliarCount, totalCards } = req.body

        if (typeof familiarCount !== 'number' || typeof unfamiliarCount !== 'number' || typeof totalCards !== 'number') {
            return res.status(400).json({ message: 'familiarCount, unfamiliarCount, totalCards are required' })
        }

        const session = await completeFlashcardSession(sessionId, userId, { familiarCount, unfamiliarCount, totalCards })
        if (!session) return res.status(404).json({ message: 'Session not found' })

        emitProgressStale(userId)

        return res.status(200).json(session)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to complete session' })
    }
}

// ---- MCQs -----------------------------------------------------------------
// MCQs are fetched and used in the test.

export const getMcqs = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const courseId = req.params.courseId as string

        const course = await getCourseById(courseId, userId)
        if (!course) return res.status(404).json({ message: 'Course not found' })

        const questions = await getMcqsByCourse(courseId, userId)
        return res.status(200).json(questions)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to fetch MCQs' })
    }
}

export const submitMcqAttempt = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const mcqId = req.params.mcqId as string
        const { selectedOptionId } = req.body

        if (!selectedOptionId || typeof selectedOptionId !== 'string') {
            return res.status(400).json({ message: 'selectedOptionId is required' })
        }

        const mcq = await getMcqById(mcqId, userId)
        if (!mcq) return res.status(404).json({ message: 'MCQ not found' })

        const selectedOption = mcq.options.find((option) => option.id === selectedOptionId)
        if (!selectedOption) {
            return res.status(400).json({ message: 'Selected option does not belong to this MCQ' })
        }

        const correctOption = mcq.options.find((option) => option.isCorrect)

        const isCorrect = selectedOption.isCorrect
        const attempt   = await insertMcqAttempt({ mcqId, userId, selectedOptionId, isCorrect })

        emitProgressStale(userId)
        
        return res.status(201).json({ ...attempt, isCorrect, correctOptionId: correctOption?.id ?? null })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to submit attempt' })
    }
}