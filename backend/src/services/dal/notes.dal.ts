import { and, asc, eq, lt, sql } from 'drizzle-orm'
import db from '../../db/connection'
import { courseFiles, courses, flashcards, flashcardSessions, mcqAttempts, mcqOptions, mcqs } from '../../db/schema'
import type { Mcq, McqOption, NewCourse, NewCourseFile, NewFlashcard, NewFlashcardSession, NewMcqAttempt } from '../../db/schema/notes.schema'

// ---- Courses --------------------------------------------------------------

export const getCoursesByUser = async (userId: string) => {
    return db.select().from(courses).where(eq(courses.userId, userId))
}

export const getCourseById = async (courseId: string, userId: string) => {
    const [course] = await db
        .select()
        .from(courses)
        .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
    return course ?? null
}

export const insertCourse = async (payload: NewCourse) => {
    const [created] = await db.insert(courses).values(payload).returning()
    return created
}

export const removeCourse = async (courseId: string, userId: string) => {
    const [deleted] = await db
        .delete(courses)
        .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
        .returning()
    return deleted
}

export const updateCourse = async (courseId: string, userId: string, data: { name: string }) => {
    const [updated] = await db
        .update(courses)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
        .returning()
    return updated ?? null
}

// Bump updatedAt whenever files change so processFiles can detect staleness.
export const touchCourse = async (courseId: string, userId: string) => {
    await db
        .update(courses)
        .set({ updatedAt: new Date() })
        .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
}

// Gets counts of files, flashcards, and MCQs for each course of a user.
export const getCourseCounts = async (userId: string) => {
    const rows = await db
        .select({
            courseId: courses.id,
            filesCount: sql<number>`count(distinct ${courseFiles.id})::int`,
            flashcardsCount: sql<number>`count(distinct ${flashcards.id})::int`,
            mcqsCount: sql<number>`count(distinct ${mcqs.id})::int`,
        })
        .from(courses)
        .leftJoin(courseFiles, eq(courseFiles.courseId, courses.id))
        .leftJoin(flashcards, eq(flashcards.courseId, courses.id))
        .leftJoin(mcqs, eq(mcqs.courseId, courses.id))
        .where(eq(courses.userId, userId))
        .groupBy(courses.id)

    const fileMap = Object.fromEntries(rows.map(r => [r.courseId, r.filesCount]))
    const flashcardMap = Object.fromEntries(rows.map(r => [r.courseId, r.flashcardsCount]))
    const mcqMap = Object.fromEntries(rows.map(r => [r.courseId, r.mcqsCount]))

    return { fileMap, flashcardMap, mcqMap }
}

// ---- Course Files ---------------------------------------------------------
// Ownership is always verified by joining back to courses and checking courses.user_id.

export const getFilesByCourse = async (courseId: string, userId: string) => {
    return db
        .select({ file: courseFiles })
        .from(courseFiles)
        .innerJoin(courses, eq(courses.id, courseFiles.courseId))
        .where(and(eq(courseFiles.courseId, courseId), eq(courses.userId, userId)))
        .then(rows => rows.map(r => r.file))
}

export const getFileByCourse = async (fileId: string, courseId: string, userId: string) => {
    return db
        .select({ file: courseFiles })
        .from(courseFiles)
        .innerJoin(courses, eq(courses.id, courseFiles.courseId))
        .where(
            and(
                eq(courseFiles.id, fileId),
                eq(courseFiles.courseId, courseId),
                eq(courses.userId, userId)
            )
        )
        .then(rows => rows.map(r => r.file))
}

export const getFileById = async (fileId: string, userId: string) => {
    const [row] = await db
        .select({ file: courseFiles })
        .from(courseFiles)
        .innerJoin(courses, eq(courses.id, courseFiles.courseId))
        .where(and(eq(courseFiles.id, fileId), eq(courses.userId, userId)))
    return row?.file ?? null
}

export const insertFile = async (payload: NewCourseFile) => {
    const [created] = await db.insert(courseFiles).values(payload).returning()
    return created
}

export const removeFile = async (fileId: string, userId: string) => {
    // Verify ownership via courses join before deleting
    const file = await getFileById(fileId, userId)
    if (!file) return undefined
    const [deleted] = await db
        .delete(courseFiles)
        .where(eq(courseFiles.id, fileId))
        .returning()
    return deleted
}

// ---- Flashcards -----------------------------------------------------------
// Ownership is verified by joining courses and checking courses.user_id.

export const getFlashcardsByCourse = async (courseId: string, userId: string) => {
    return db
        .select({ card: flashcards })
        .from(flashcards)
        .innerJoin(courses, eq(courses.id, flashcards.courseId))
        .where(and(eq(flashcards.courseId, courseId), eq(courses.userId, userId)))
        .orderBy(asc(flashcards.createdAt))
        .then(rows => rows.map(r => r.card))
}

export const insertFlashcard = async (payload: NewFlashcard) => {
    const [created] = await db.insert(flashcards).values(payload).returning()
    return created
}

export const replaceFlashcardContent = async (
    flashcardId: string,
    userId: string,
    data: { question: string; answer: string; sourceFileId?: string | null }
) => {
    // Verify ownership via courses join
    const [existing] = await db
        .select({ id: flashcards.id })
        .from(flashcards)
        .innerJoin(courses, eq(courses.id, flashcards.courseId))
        .where(and(eq(flashcards.id, flashcardId), eq(courses.userId, userId)))
    if (!existing) return null

    const [updated] = await db
        .update(flashcards)
        .set({
            question: data.question,
            answer: data.answer,
            sourceFileId: data.sourceFileId ?? null,
            updatedAt: new Date(),
        })
        .where(eq(flashcards.id, flashcardId))
        .returning()
    return updated ?? null
}

export const removeFlashcard = async (flashcardId: string, userId: string) => {
    const [existing] = await db
        .select({ id: flashcards.id })
        .from(flashcards)
        .innerJoin(courses, eq(courses.id, flashcards.courseId))
        .where(and(eq(flashcards.id, flashcardId), eq(courses.userId, userId)))
    if (!existing) return undefined

    const [deleted] = await db
        .delete(flashcards)
        .where(eq(flashcards.id, flashcardId))
        .returning()
    return deleted
}

// ---- Flashcard Sessions ---------------------------------------------------

export const insertFlashcardSession = async (payload: Omit<NewFlashcardSession, 'expiresAt'>) => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)
    const [created] = await db
        .insert(flashcardSessions)
        .values({ ...payload, expiresAt })
        .returning()
    return created
}

export const completeFlashcardSession = async (
    sessionId: string,
    userId: string,
    counts: { familiarCount: number; unfamiliarCount: number; totalCards: number }
) => {
    const [updated] = await db
        .update(flashcardSessions)
        .set({ ...counts, completedAt: new Date() })
        .where(and(eq(flashcardSessions.id, sessionId), eq(flashcardSessions.userId, userId)))
        .returning()
    return updated
}

export const deleteExpiredSessions = async () => {
    await db
        .delete(flashcardSessions)
        .where(lt(flashcardSessions.expiresAt, new Date()))
}

export const getSessionsByCourse = async (courseId: string, userId: string) => {
    return db
        .select()
        .from(flashcardSessions)
        .where(
            and(
                eq(flashcardSessions.courseId, courseId),
                eq(flashcardSessions.userId, userId),
            )
        )
        .orderBy(flashcardSessions.startedAt)
}

// ---- MCQs -----------------------------------------------------------------

export type McqWithOptions = Mcq & {
    options: Array<Pick<McqOption, 'id' | 'optionIndex' | 'optionText' | 'isCorrect'>>
}

type McqInput = {
    courseId: string
    question: string
    options: string[]
    correctOption: number
    explanation: string | null
    difficulty: 'easy' | 'medium' | 'hard'
    aiGenerated: boolean
    sourceFileId?: string | null
}

const toMcqWithOptions = (
    rows: Array<{
        mcq: Mcq
        option: McqOption | null
    }>
): McqWithOptions[] => {
    const map = new Map<string, McqWithOptions>()

    for (const row of rows) {
        const existing = map.get(row.mcq.id)
        if (!existing) {
            map.set(row.mcq.id, {
                ...row.mcq,
                options: row.option ? [{ id: row.option.id, optionIndex: row.option.optionIndex, optionText: row.option.optionText, isCorrect: row.option.isCorrect }] : [],
            })
            continue
        }

        if (row.option) {
            existing.options.push({
                id: row.option.id,
                optionIndex: row.option.optionIndex,
                optionText: row.option.optionText,
                isCorrect: row.option.isCorrect,
            })
        }
    }

    return Array.from(map.values())
}

export const getMcqsByCourse = async (courseId: string, userId: string) => {
    const rows = await db
        .select({ mcq: mcqs, option: mcqOptions })
        .from(mcqs)
        .innerJoin(courses, eq(courses.id, mcqs.courseId))
        .leftJoin(mcqOptions, eq(mcqOptions.mcqId, mcqs.id))
        .where(and(eq(mcqs.courseId, courseId), eq(courses.userId, userId)))
        .orderBy(asc(mcqs.createdAt), asc(mcqOptions.optionIndex))

    return toMcqWithOptions(rows)
}

export const getMcqById = async (mcqId: string, userId: string) => {
    const rows = await db
        .select({ mcq: mcqs, option: mcqOptions })
        .from(mcqs)
        .innerJoin(courses, eq(courses.id, mcqs.courseId))
        .leftJoin(mcqOptions, eq(mcqOptions.mcqId, mcqs.id))
        .where(and(eq(mcqs.id, mcqId), eq(courses.userId, userId)))

    const [mcq] = toMcqWithOptions(rows)
    return mcq ?? null
}

export const insertMcqWithOptions = async (payload: McqInput): Promise<McqWithOptions> => {
    const { options, correctOption } = payload
    if (!Array.isArray(options) || options.length === 0) {
        throw new Error('options array is required')
    }
    if (correctOption < 0 || correctOption >= options.length) {
        throw new Error('correctOption is out of range')
    }

    return db.transaction(async (tx) => {
        const [created] = await tx
            .insert(mcqs)
            .values({
                courseId: payload.courseId,
                question: payload.question,
                explanation: payload.explanation,
                difficulty: payload.difficulty,
                aiGenerated: payload.aiGenerated,
                sourceFileId: payload.sourceFileId ?? null,
            })
            .returning()

        const insertedOptions = await tx
            .insert(mcqOptions)
            .values(
                options.map((optionText, optionIndex) => ({
                    mcqId: created.id,
                    optionIndex,
                    optionText,
                    isCorrect: optionIndex === correctOption,
                }))
            )
            .returning()

        return {
            ...created,
            options: insertedOptions
                .sort((a, b) => a.optionIndex - b.optionIndex)
                .map((o) => ({ id: o.id, optionIndex: o.optionIndex, optionText: o.optionText, isCorrect: o.isCorrect })),
        }
    })
}

export const replaceMcqContent = async (
    mcqId: string,
    userId: string,
    data: { question: string; options: string[]; correctOption: number; explanation: string | null; difficulty: 'easy' | 'medium' | 'hard'; sourceFileId?: string | null }
) => {
    const { options, correctOption } = data
    if (!Array.isArray(options) || options.length === 0) throw new Error('options array is required')
    if (correctOption < 0 || correctOption >= options.length) throw new Error('correctOption is out of range')

    // Verify ownership
    const [existing] = await db
        .select({ id: mcqs.id })
        .from(mcqs)
        .innerJoin(courses, eq(courses.id, mcqs.courseId))
        .where(and(eq(mcqs.id, mcqId), eq(courses.userId, userId)))
    if (!existing) return null

    return db.transaction(async (tx) => {
        const [updated] = await tx
            .update(mcqs)
            .set({
                question: data.question,
                explanation: data.explanation,
                difficulty: data.difficulty,
                sourceFileId: data.sourceFileId ?? null,
                updatedAt: new Date(),
            })
            .where(eq(mcqs.id, mcqId))
            .returning()

        if (!updated) return null

        const existingOptions = await tx
            .select()
            .from(mcqOptions)
            .where(eq(mcqOptions.mcqId, mcqId))
            .orderBy(asc(mcqOptions.optionIndex))

        const updatedOptions = await Promise.all(
            existingOptions.map((opt, i) =>
                tx
                    .update(mcqOptions)
                    .set({ optionText: options[i] ?? options[0], isCorrect: i === correctOption })
                    .where(eq(mcqOptions.id, opt.id))
                    .returning()
                    .then(([r]) => r)
            )
        )

        return {
            ...updated,
            options: updatedOptions
                .sort((a, b) => a.optionIndex - b.optionIndex)
                .map((o) => ({ id: o.id, optionIndex: o.optionIndex, optionText: o.optionText, isCorrect: o.isCorrect })),
        }
    })
}

export const removeMcq = async (mcqId: string, userId: string) => {
    const [existing] = await db
        .select({ id: mcqs.id })
        .from(mcqs)
        .innerJoin(courses, eq(courses.id, mcqs.courseId))
        .where(and(eq(mcqs.id, mcqId), eq(courses.userId, userId)))
    if (!existing) return undefined

    const [deleted] = await db
        .delete(mcqs)
        .where(eq(mcqs.id, mcqId))
        .returning()
    return deleted
}

// ---- MCQ Attempts ---------------------------------------------------------
export const insertMcqAttempt = async (payload: NewMcqAttempt) => {
    const [created] = await db.insert(mcqAttempts).values(payload).returning()
    return created
}

export const deleteFlashcardOnly = async (flashcardId: string, userId: string) => {
    const [existing] = await db
        .select({ id: flashcards.id })
        .from(flashcards)
        .innerJoin(courses, eq(courses.id, flashcards.courseId))
        .where(and(eq(flashcards.id, flashcardId), eq(courses.userId, userId)))
    if (!existing) return undefined

    const [deleted] = await db
        .delete(flashcards)
        .where(eq(flashcards.id, flashcardId))
        .returning()
    return deleted
}

export const deleteMcqOnly = async (mcqId: string, userId: string) => {
    const [existing] = await db
        .select({ id: mcqs.id })
        .from(mcqs)
        .innerJoin(courses, eq(courses.id, mcqs.courseId))
        .where(and(eq(mcqs.id, mcqId), eq(courses.userId, userId)))
    if (!existing) return undefined

    await db.delete(mcqOptions).where(eq(mcqOptions.mcqId, mcqId))
    const [deleted] = await db
        .delete(mcqs)
        .where(eq(mcqs.id, mcqId))
        .returning()
    return deleted
}
