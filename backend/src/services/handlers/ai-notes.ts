import { fetchGeminiTextResponse, withRetry } from '../../utils/ai-chatbot.utils'
import { extractTextFromPdf, extractTextFromDocx } from '../../utils/rag.utils'
import path from 'path'

// ── Text Extraction ─────────────────────────────────────────────────────────

export async function extractTextFromFile(storagePath: string, mimeType: string, originalName: string): Promise<string> {
    const fullPath = path.join(process.cwd(), storagePath)

    if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) return extractTextFromPdf(fullPath)

    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        originalName.toLowerCase().endsWith('.docx')
    ) {
        return extractTextFromDocx(fullPath)
    }
    throw new Error(`Unsupported file type for AI processing: ${mimeType}`)
}

// ── Flashcard Generation ────────────────────────────────────────────────────
export interface AIFlashcard {
    question: string
    answer:   string
}

export async function generateFlashcardsFromText(text: string, count = 5): Promise<AIFlashcard[]> {
    // Trim text to avoid token limits (~12k chars is safe)
    const trimmed = text.slice(0, 12000)

    const prompt = `You are an expert educator. Generate exactly ${count} flashcards from the provided study material.
Return ONLY a valid JSON array with no extra text, markdown, or explanation.
Each element must have exactly two string fields: "question" and "answer".
Example format:
[{"question":"What is X?","answer":"X is ..."},{"question":"Define Y","answer":"Y means ..."}]`

    const messages = [{ role: 'user' as const, content: `Study material:\n\n${trimmed}` }]

    const raw = await withRetry(() => fetchGeminiTextResponse(messages, prompt))

    // Strip possible markdown fences
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed: AIFlashcard[] = JSON.parse(cleaned)

    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('AI returned invalid flashcard format')
    }

    return parsed.slice(0, count)
}

// ── MCQ Generation ──────────────────────────────────────────────────────────

export interface AIMcq {
    question:      string
    options:       string[]
    correctOption: number
    explanation:   string
    difficulty:    'easy' | 'medium' | 'hard'
}

export async function generateMcqsFromText(text: string, count = 5): Promise<AIMcq[]> {
    const trimmed = text.slice(0, 12000)

    const prompt = `You are an expert educator. Generate exactly ${count} multiple-choice questions from the provided study material.
Return ONLY a valid JSON array with no extra text, markdown, or explanation.
Each element must have:
  - "question": string
  - "options": array of exactly 4 strings
  - "correctOption": 0-based index of the correct option (integer)
  - "explanation": brief explanation of the correct answer (string)
  - "difficulty": one of "easy", "medium", or "hard"
Example:
[{"question":"What is X?","options":["A","B","C","D"],"correctOption":2,"explanation":"Because C is correct","difficulty":"medium"}]`

    const messages = [{ role: 'user' as const, content: `Study material:\n\n${trimmed}` }]

    const raw = await withRetry(() => fetchGeminiTextResponse(messages, prompt))

    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed: AIMcq[] = JSON.parse(cleaned)

    if (!Array.isArray(parsed) || parsed.length === 0)  throw new Error('AI returned invalid MCQ format')
    
    return parsed.slice(0, count)
}