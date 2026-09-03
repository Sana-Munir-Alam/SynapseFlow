import { Request, Response } from "express";
import { getMyGroupsFromDB } from "../services/dal/groups.dal";
import { getCoursesByUser } from "../services/dal/notes.dal";
import { AIMessageType, SAMPLE_CONVERSATION, streamResponseToClients } from '../utils/ai-chatbot.utils';
import { STATIC_PROMPT } from "../utils/data";
import { buildRAGSystemPrompt } from "../services/handlers/rag-search";
import { semanticSearch } from "../utils/rag.utils";
import {transcribeAudio} from "../utils/ai-chatbot.utils";
import { verifyAudioSignature } from '../utils/fileSignature.utils'
import { getPreviousMessages, saveChatbotMessage, getCachedRAGResponse, setCachedRAGResponse, normalizeQuery } from "../services/dal/chatbot.dal";


export async function handleChatbotMessage(req: Request, res: Response) {
    try {
        const prompt = req.body.content as string;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const userId = user.id;

        const [courses, groups] = await Promise.all([
            getCoursesByUser(userId),
            getMyGroupsFromDB(userId),
        ])

        const systemPrompt = buildSystemPrompt({ user, courses, groups })

        const prevMessages = await getPreviousMessages(userId)

        await saveChatbotMessage(userId, 'user', prompt)

        const messages: AIMessageType[] = [
            ...SAMPLE_CONVERSATION,
            ...prevMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: prompt }
        ]

        let fullResponse: any;
        if (req.body.docs) {
            const normalizedQuery = normalizeQuery(prompt)
            const relevantChunks = await semanticSearch({ query: prompt, userId, limit: 5 });
            const fileIds = relevantChunks.map((chunk: any) => chunk.fileId)
            const cached = await getCachedRAGResponse(userId, normalizedQuery, fileIds)
            console.log(cached ? '[RAG cache] HIT' : '[RAG cache] MISS')

            if (cached) {
                res.setHeader('Content-Type', 'text/event-stream')
                res.setHeader('Cache-Control', 'no-cache')
                res.setHeader('Connection', 'keep-alive')
                res.flushHeaders()
                res.write(`data: ${cached.replace(/\n/g, '\\n')}\n\n`)
                res.write('data: [DONE]\n\n')
                fullResponse = cached
            } else {
                const ragSystemPrompt = buildRAGSystemPrompt(relevantChunks);
                fullResponse = await streamResponseToClients({res, systemPrompt: ragSystemPrompt, messages})
                await setCachedRAGResponse(userId, normalizedQuery, fileIds, fullResponse)
            }
        } else {
            fullResponse = await streamResponseToClients({res, systemPrompt, messages})
        }
        await saveChatbotMessage(userId, 'assistant', fullResponse)
        res.end()

    } catch (err: any) {
        console.error(err)
        if (!res.headersSent) {
            return res.status(500).json({ message: 'Failed to process chatbot request' })
        }
    }
}

export async function getCopilotHistory(req: Request, res: Response) {
    try {
        const user = req.user

        if (!user) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const messages = await getPreviousMessages(user.id)

        return res.status(200).json({
            messages: messages.map((message) => ({
                id: message.id,
                role: message.role,
                content: message.content,
                createdAt: message.createdAt,
            })),
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'Failed to fetch copilot history' })
    }
}

export async function transcribeVoiceMessage(req: Request, res: Response) {
    try {
        const user = req.user
        if (!user) return res.status(401).json({ message: 'User not authenticated' })
        const audioFile = (req as any).file
        if (!audioFile) return res.status(400).json({ message: 'No audio file uploaded' })

        if (!verifyAudioSignature(audioFile.buffer, audioFile.mimetype)) {
            return res.status(400).json({ message: 'Uploaded file does not look like a valid audio recording' })
        }

        const transcript = await transcribeAudio(audioFile.buffer, audioFile.mimetype)
        const cleaned = transcript?.trim()

        if (!cleaned || cleaned.toUpperCase() === 'NO_SPEECH_DETECTED') {
            return res.status(422).json({ message: 'No speech detected — try again closer to the mic' })
        }

        return res.status(200).json({ transcript: cleaned })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to transcribe audio' })
    }
}

type PromptUser = Pick<Express.UserPayload, 'username' | 'email'>
type PromptCourse = { name: string }
type PromptGroup = { name: string }

function buildSystemPrompt({ user, courses, groups }: { user: PromptUser; courses: PromptCourse[]; groups: PromptGroup[] }) {
    const now = new Date().toLocaleString()
    const courseList = courses.map(c => c.name).join(', ')
    const groupList = groups.map(g => g.name).join(', ')

    return `
${STATIC_PROMPT}

--- User Context ---
Current date and time: ${now}
Student name: ${user.username}
Courses: ${courseList || 'No courses yet'}
Study groups: ${groupList || 'No groups yet'}

Use the above information to personalize your responses.
Only refer to information explicitly listed above. Do not invent details.
    `.trim()
}