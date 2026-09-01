import express from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { verifyToken } from '../middleware/verifyToken.middleware'
import { getCourses, createCourse, deleteCourse, renameCourse, getFiles, uploadFile, downloadFile, previewFile, deleteFile, getFlashcards, generateFlashcards, regenerateFlashcards, startFlashcardSession, finishFlashcardSession, getMcqs, generateMcqs, regenerateMcqs, submitMcqAttempt, getFile} from '../controllers/notes.controller'

const router = express.Router()
router.use(verifyToken)

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname)
        cb(null, `${uuidv4()}${ext}`)
    },
})

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'image/jpeg',
            'image/png',
        ]
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Unsupported file type'))
    },
})

// ── Courses ────────────────────────────────────────────────────────────────
router.get('/', getCourses)
router.post('/', createCourse)

// ── Static file routes MUST come before /:courseId wildcard ────────────────
router.get('/files/:fileId/download', downloadFile)
router.get('/files/:fileId/preview', previewFile)
router.delete('/files/:fileId', deleteFile)


// ── Sessions (static segment — before /:courseId wildcard) ─────────────────
router.patch('/sessions/:sessionId/complete', finishFlashcardSession)
 
// ── Course delete / rename (wildcard — must be after static routes above) ──
router.delete('/:courseId', deleteCourse)
router.patch('/:courseId', renameCourse)

// ── Files ──────────────────────────────────────────────────────────────────
router.get('/:courseId/files', getFiles)
router.get('/:courseId/file/:fileId', getFile)
router.post('/:courseId/files', upload.single('file'), uploadFile)

// ── Flashcards ─────────────────────────────────────────────────────────────
router.get('/:courseId/flashcards', getFlashcards)
router.post('/:courseId/flashcards/regenerate', regenerateFlashcards)
router.post('/:courseId/flashcards/session', startFlashcardSession)
router.post('/:courseId/flashcards', generateFlashcards)

// ── MCQs ───────────────────────────────────────────────────────────────────
router.get('/:courseId/mcqs', getMcqs)
router.post('/:courseId/mcqs/regenerate', regenerateMcqs)
router.post('/:courseId/mcqs', generateMcqs)
router.post('/:courseId/mcqs/:mcqId/attempt', submitMcqAttempt)

export default router