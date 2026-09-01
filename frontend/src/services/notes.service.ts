import { api } from '../lib/axios'

// ---- Types ----------------------------------------------------------------

export interface Course {
    id:              string
    userId:          string
    name:            string
    filesCount:      number
    flashcardsCount: number
    mcqsCount:       number
    createdAt:       string
    updatedAt:       string
}

export interface CourseFile {
    id:           string
    courseId:     string
    userId:       string
    originalName: string
    storagePath:  string
    mimeType:     string
    sizeBytes:    number
    aiProcessed:  boolean
    createdAt:    string
}

export interface Flashcard {
    id:          string
    courseId:    string
    userId:      string
    question:    string
    answer:      string
    aiGenerated: boolean
    createdAt:   string
    updatedAt:   string
}

export type McqDifficulty = 'easy' | 'medium' | 'hard'

export interface McqOption {
    id:          string
    optionIndex: number
    optionText:  string
    isCorrect:   boolean
}

export interface Mcq {
    id:            string
    courseId:      string
    userId:        string
    question:      string
    options:       McqOption[]
    explanation:   string | null
    difficulty:    McqDifficulty
    aiGenerated:   boolean
    createdAt:     string
    updatedAt:     string
}

export interface McqAttemptResult {
    id:               string
    mcqId:            string
    userId:           string
    selectedOptionId: string
    isCorrect:        boolean
    correctOptionId:  string | null
    attemptedAt:      string
}

// ---- Courses --------------------------------------------------------------

export const fetchCourses = async (): Promise<Course[]> => {
    const res = await api.get('/notes')
    return res.data
}

export const createCourse = async (payload: { name: string; color?: string }): Promise<Course> => {
    const res = await api.post('/notes', payload)
    return res.data
}

export const deleteCourse = async (courseId: string): Promise<void> => {
    await api.delete(`/notes/${courseId}`)
}

export const renameCourse = async (courseId: string, name: string): Promise<Course> => {
    const res = await api.patch(`/notes/${courseId}`, { name })
    return res.data
}

// ---- Files ----------------------------------------------------------------

export const fetchFiles = async (courseId: string): Promise<CourseFile[]> => {
    const res = await api.get(`/notes/${courseId}/files`)
    return res.data
}

export const fetchFile = async (fileId: string, courseId: string): Promise<CourseFile> => {
    const res = await api.get(`/notes/${courseId}/file/${fileId}`)
    return res.data
}

export const uploadFile = async (courseId: string, file: File): Promise<CourseFile> => {
    const form = new FormData()
    form.append('file', file)

    const res = await api.post(`/notes/${courseId}/files`, form, {
        headers: { 'Content-Type': undefined },
    })
    return res.data
}

export const deleteFile = async (fileId: string): Promise<void> => {
    await api.delete(`/notes/files/${fileId}`)
}

export const getDownloadUrl = (fileId: string): string =>
    `${api.defaults.baseURL}/notes/files/${fileId}/download`

export const getPreviewUrl = (fileId: string): string =>
    `${api.defaults.baseURL}/notes/files/${fileId}/preview`

// ---- Flashcards -----------------------------------------------------------

export const fetchFlashcards = async (courseId: string): Promise<Flashcard[]> => {
    const res = await api.get(`/notes/${courseId}/flashcards`)
    return res.data
}

export interface FlashcardSeedItem {
    question: string
    answer:   string
}

export interface FlashcardSession {
    id:              string
    userId:          string
    courseId:        string
    familiarCount:   number
    unfamiliarCount: number
    totalCards:      number
    startedAt:       string
    completedAt:     string | null
    expiresAt:       string
}

// Triggers AI generation of flashcards from uploaded course files.
export const processFilesForFlashcards = async (courseId: string): Promise<Flashcard[]> => {
    const res = await api.post(`/notes/${courseId}/flashcards`)
    return res.data
}

export const regenerateFlashcards = async (courseId: string): Promise<Flashcard[]> => {
    const res = await api.post(`/notes/${courseId}/flashcards/regenerate`)
    return res.data
}

export const startFlashcardSession = async (courseId: string): Promise<FlashcardSession> => {
    const res = await api.post(`/notes/${courseId}/flashcards/session`)
    return res.data
}

export const finishFlashcardSession = async (
    sessionId:       string,
    familiarCount:   number,
    unfamiliarCount: number,
    totalCards:      number,
): Promise<FlashcardSession> => {
    const res = await api.patch(`/notes/sessions/${sessionId}/complete`, {
        familiarCount, unfamiliarCount, totalCards,
    })
    return res.data
}

// ---- MCQs -----------------------------------------------------------------

export const fetchMcqs = async (courseId: string): Promise<Mcq[]> => {
    const res = await api.get(`/notes/${courseId}/mcqs`)
    return res.data
}

export interface McqSeedItem {
    question:      string
    options:       string[]
    correctOption: number
    explanation:   string
    difficulty:    McqDifficulty
}

// Triggers AI generation of MCQs from uploaded course files.
export const processFilesForMcqs = async (courseId: string): Promise<Mcq[]> => {
    const res = await api.post(`/notes/${courseId}/mcqs`)
    return res.data
}

export const regenerateMcqs = async (courseId: string): Promise<Mcq[]> => {
    const res = await api.post(`/notes/${courseId}/mcqs/regenerate`)
    return res.data
}

export const submitMcqAttempt = async (
    courseId:       string,
    mcqId:          string,
    selectedOptionId: string,
): Promise<McqAttemptResult> => {
    const res = await api.post(`/notes/${courseId}/mcqs/${mcqId}/attempt`, { selectedOptionId })
    return res.data
}