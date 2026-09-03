import { AIMessageType, fetchGeminiTextResponse, executeAITaskWithSocketUpdates } from "../../utils/ai-chatbot.utils";
import { semanticSearch } from "../../utils/rag.utils";


export async function handleDocumentRAGRequest(userId: string, query: string, groupId?: string) {
    try {
        const response = await executeAITaskWithSocketUpdates(groupId, async () => {
            const relevantChunks = await semanticSearch({ query, userId, limit: 5 });

            const sysPrompt = buildRAGSystemPrompt(relevantChunks);
            const messages: AIMessageType[] = [{ role: 'user', content: query }]
            const response = await fetchGeminiTextResponse(messages, sysPrompt);
            return response;
        });

        return response;
    } catch (err) {
        console.error(err)
        throw err;
    }
}

export const buildRAGSystemPrompt = (chunksFromDb: any[]) => {
    const context = chunksFromDb.map((chunk) => {
        const location = chunk.pageNumber ? `page ${chunk.pageNumber}` : 'section unknown'
        return `Source: ${chunk.courseFile?.originalName} (${location})\nContent: ${chunk.chunkText}`
    }).join('\n\n---\n\n');
    return `
        You are a helpful teaching assistant. Use the following context from the course materials to answer the user's question. Each source below is labeled with its real file name and page number — cite it exactly as given (e.g. "According to Week1.pdf, page 4"). Never invent a page number that isn't shown in the CONTEXT.
        Respond in the same language the student wrote their question in — if they wrote in Urdu, respond in Urdu; if English, respond in English.
        CONTEXT:
        ${context}
        INSTRUCTIONS:
        - Answer clearly and concisely.
        - If something is not in the context, say "I don't know based on the course materials."
        - Do not make up information.
        - If the user asks to "explain" or "elaborate" on something in the context, do so in detail.
    `;
}