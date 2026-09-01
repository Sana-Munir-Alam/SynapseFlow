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
        return `
            Source: ${chunk.courseFile?.originalName}
            Content: ${chunk.chunkText}
        `;
    }).join('\n\n---\n\n');

    return `
    You are a helpful teaching assistant. Use the following context from the course materials to answer the user's question. You must refer to the page number or sections of the notes as much as possible.

    CONTEXT:
    ${context}

    INSTRUCTIONS:
    - Answer clearly and concisely.
    - If something is not in the context, say "I don't know based on the course materials."
    - Do not make up information.
    - If the user asks to "explain" or "elaborate" on something in the context, do so in detail.
  `;
}