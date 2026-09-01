import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchCourses, createCourse, deleteCourse, renameCourse, fetchFiles, uploadFile, deleteFile, fetchFlashcards, processFilesForFlashcards, regenerateFlashcards, startFlashcardSession, finishFlashcardSession, fetchMcqs, processFilesForMcqs, regenerateMcqs, submitMcqAttempt, fetchFile,} from '../services/notes.service'

// ---- Courses --------------------------------------------------------------

export const useCourses = () =>
    useQuery({
        queryKey: ['courses'],
        queryFn:  fetchCourses,
        staleTime: 2 * 60 * 1000,
    })

export const useCreateCourse = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: { name: string; color?: string }) => createCourse(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['courses'] })
            toast.success('Course created!')
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create course'),
    })
}

export const useDeleteCourse = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (courseId: string) => deleteCourse(courseId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['courses'] })
            toast.success('Course deleted')
        },
        onError: () => toast.error('Failed to delete course'),
    })
}

export const useRenameCourse = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ courseId, name }: { courseId: string; name: string }) => renameCourse(courseId, name),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['courses'] })
            toast.success('Course renamed!')
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to rename course'),
    })
}

// ---- Files ----------------------------------------------------------------

export const useFiles = (courseId: string) =>
    useQuery({
        queryKey: ['files', courseId],
        queryFn:  () => fetchFiles(courseId),
        enabled:  !!courseId,
        staleTime: 2 * 60 * 1000,
    })

export const useFile = (fileId:string, courseId: string) =>
    useQuery({
        queryKey: ['file', courseId, fileId],
        queryFn:  () => fetchFile(fileId, courseId),
        enabled:  !!courseId && !!fileId,
        staleTime: 2 * 60 * 1000,
    })

export const useUploadFile = (courseId: string) => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (file: File) => uploadFile(courseId, file),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['files', courseId] })
            qc.invalidateQueries({ queryKey: ['courses'] })
            toast.success(`${data.originalName} uploaded`)
        },
        onError: () => toast.error('Upload failed'),
    })
}

export const useDeleteFile = (courseId: string) => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (fileId: string) => deleteFile(fileId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['files', courseId] })
            qc.invalidateQueries({ queryKey: ['courses'] })
            toast.success('File deleted')
        },
        onError: () => toast.error('Failed to delete file'),
    })
}

// ---- Flashcards -----------------------------------------------------------
// useSeedFlashcards will call the AI API instead of seeding sample data.

export const useFlashcards = (courseId: string) =>
    useQuery({
        queryKey: ['flashcards', courseId],
        queryFn:  () => fetchFlashcards(courseId),
        enabled:  !!courseId,
        staleTime: 2 * 60 * 1000,
    })

export const useProcessFilesForFlashcards = (courseId: string) => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => processFilesForFlashcards(courseId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['flashcards', courseId] })
            qc.invalidateQueries({ queryKey: ['courses'] })
            toast.success('Flashcards generated!')
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to generate flashcards'),
    })
}

export const useRegenerateFlashcards = (courseId: string) => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => regenerateFlashcards(courseId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['flashcards', courseId] })
            toast.success('Flashcards regenerated!')
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to regenerate flashcards'),
    })
}

export const useStartFlashcardSession = (courseId: string) =>
    useMutation({
        mutationFn: () => startFlashcardSession(courseId),
        onError: () => toast.error('Failed to start session'),
    })

export const useFinishFlashcardSession = () =>
    useMutation({
        mutationFn: ({
            sessionId, familiarCount, unfamiliarCount, totalCards,
        }: {
            sessionId: string; familiarCount: number; unfamiliarCount: number; totalCards: number
        }) => finishFlashcardSession(sessionId, familiarCount, unfamiliarCount, totalCards),
        onError: () => toast.error('Failed to save session'),
    })

// ---- MCQs -----------------------------------------------------------------
// useSeedMcqs will call the AI API instead of seeding sample data.

export const useMcqs = (courseId: string) =>
    useQuery({
        queryKey: ['mcqs', courseId],
        queryFn:  () => fetchMcqs(courseId),
        enabled:  !!courseId,
        staleTime: 2 * 60 * 1000,
    })

export const useProcessFilesForMcqs = (courseId: string) => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => processFilesForMcqs(courseId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['mcqs', courseId] })
            qc.invalidateQueries({ queryKey: ['courses'] })
            toast.success('MCQs generated!')
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to generate MCQs'),
    })
}

export const useRegenerateMcqs = (courseId: string) => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => regenerateMcqs(courseId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['mcqs', courseId] })
            toast.success('MCQs regenerated!')
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to regenerate MCQs'),
    })
}

export const useSubmitMcqAttempt = (courseId: string) =>
    useMutation({
        mutationFn: ({ mcqId, selectedOptionId }: { mcqId: string; selectedOptionId: string }) =>
            submitMcqAttempt(courseId, mcqId, selectedOptionId),
        onError: () => toast.error('Failed to submit attempt'),
    })