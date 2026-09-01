import { Request, Response } from "express";
import { getPreviousMessages, saveChatbotMessage } from "../services/dal/chatbot.dal";
import { getMyGroupsFromDB } from "../services/dal/groups.dal";
import { getCoursesByUser } from "../services/dal/notes.dal";
import { AIMessageType, SAMPLE_CONVERSATION, streamResponseToClients } from '../utils/ai-chatbot.utils';
import { STATIC_PROMPT } from "../utils/data";
import { buildRAGSystemPrompt } from "../services/handlers/rag-search";
import { semanticSearch } from "../utils/rag.utils";


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
            const relevantChunks = await semanticSearch({ query: prompt, userId, limit: 5 });
            const ragSystemPrompt = buildRAGSystemPrompt(relevantChunks);
            
            fullResponse = await streamResponseToClients({res, systemPrompt: ragSystemPrompt, messages})
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