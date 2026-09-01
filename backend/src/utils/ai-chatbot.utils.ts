import { streamText, ModelMessage, generateText } from "ai"
import { google } from "@ai-sdk/google"
import { Response } from "express"
import env from "../config/env"
import { getIO } from "../socket"
import { addNewMessage } from "../services/dal/messages.dal"
import { getGroupById } from "../services/dal/groups.dal"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// exponential backoff function
export const withRetry = async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
): Promise<T> => {
    let lastError: any

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn()
        } catch (err: any) {
            lastError = err
            const errStatus = err?.status || err?.statusCode
            const isRetryable = errStatus === 503 || errStatus === 429

            if (!isRetryable || attempt === maxAttempts) throw err

            const delay = baseDelay * attempt
            console.warn(`Gemini attempt ${attempt} failed with ${errStatus}. Retrying in ${delay}ms...`)
            await sleep(delay)
        }
    }

    throw lastError
}

export type AIMessageType = {
    role: 'user' | 'model' | 'assistant';
    content: string;
}

export const SAMPLE_CONVERSATION: AIMessageType[] = [
    { role: 'user', content: 'What can you help me with?' },
    { role: 'assistant', content: 'I can help you with your courses, answer study questions, and provide information about your groups and deadlines.' },
]


type StreamResponseToClientsPayload = {
    res: Response
    systemPrompt: string
    messages: AIMessageType[]
}

export const streamResponseToClients =
    async ({ res, systemPrompt, messages }: StreamResponseToClientsPayload): Promise<string> => {
        try {
            // SSE Headers
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')
            res.flushHeaders()

            let fullResponse = ''

            const coreMessages = buildMsgsArray(messages)

            let iterator: AsyncIterator<string> | undefined;
            let firstChunkResult: IteratorResult<string> | undefined;

            // streamText returns an object synchronously, but the API connection is asynchronous.
            // To properly catch and retry 503/429 errors, we must explicitly await the very first 
            // chunk of the stream inside the retry wrapper.
            await withRetry(async () => {
                const result = streamText({
                    model: google(env.GEMINI_MODEL),
                    system: systemPrompt,
                    messages: coreMessages,
                });

                iterator = result.textStream[Symbol.asyncIterator]();
                firstChunkResult = await iterator?.next();
            });

            if (firstChunkResult && !firstChunkResult.done) {
                fullResponse += firstChunkResult.value;
                res.write(`data: ${firstChunkResult.value.replace(/\n/g, '\\n')}\n\n`);
            }

            if (iterator) {
                while (true) {
                    const chunkResult = await iterator.next();
                    if (chunkResult.done) break;

                    fullResponse += chunkResult.value;
                    res.write(`data: ${chunkResult.value.replace(/\n/g, '\\n')}\n\n`);
                }
            }

            // SSE Done
            res.write('data: [DONE]\n\n')

            return fullResponse
        } catch (err: any) {
            const errStatus = err?.status || err?.statusCode;
            const isAIUnavailable = errStatus === 503 || errStatus === 429

            // If headers already sent, we can't send a JSON error response
            // so we signal the error through the stream instead
            const errorMessage = isAIUnavailable ? 'AI is currently busy' : 'Something went wrong';
            
            if (res.headersSent) {
                res.write(`data: [ERROR] ${errorMessage}\n\n`)
                res.end()
            } else {
                res.status(isAIUnavailable ? 503 : 500).json({
                    message: isAIUnavailable
                        ? 'AI is currently busy, please try again shortly'
                        : 'Failed to process message'
                })
            }
            throw err;
        }
    }

export const fetchGeminiTextResponse = async (messages: AIMessageType[], prompt: string) => {
    const coreMessages = buildMsgsArray(messages);

    const startTime = performance.now();

    const { text } = await generateText({
        model: google(env.GEMINI_MODEL),
        system: prompt,
        messages: coreMessages,
        maxRetries: 0, // Disable Vercel's internal hidden retries
    });

    const endTime = performance.now();
    console.log(`\n⏱️  [AI Latency] Gemini API call took ${((endTime - startTime) / 1000).toFixed(2)} seconds\n`);

    return text;
}

const buildMsgsArray = (messages: AIMessageType[]): ModelMessage[] => {
    return messages.map(m => {
        const isAssistant = m.role === 'assistant' || m.role === 'model';
        return {
            role: isAssistant ? 'assistant' : 'user',
            content: m.content,
        };
    });
}

export const executeAITaskWithSocketUpdates = async (groupId: string | undefined, fn: () => Promise<string>) => {
    try {
        if (groupId) {
            getIO().to(groupId).emit('ai_typing', { groupId, isTyping: true });
        }

        // Execute the generic AI callback
        const response = await fn();

        if (groupId) {
            const [savedMessage] = await addNewMessage(groupId, null, response, 'ai');

            const messagePayload = {
                id: savedMessage.id,
                groupId: savedMessage.groupId,
                content: savedMessage.content,
                createdAt: savedMessage.createdAt,
                senderType: 'ai',
                sender: null
            };

            getIO().to(groupId).emit('new_message', messagePayload);
            getIO().to(groupId).emit('ai_typing', { groupId, isTyping: false });
        }

        return response;
    }
    catch (err: any) {
        console.error("AI Response Error: ", err);
        if (groupId) {
            const errStatus = err?.status || err?.statusCode;
            const isAIUnavailable = errStatus === 503 || errStatus === 429;
            const errorMessage = isAIUnavailable
                ? "I am currently experiencing high demand. Please try again shortly."
                : "Something went wrong while processing your request.";

            try {
                const [savedMessage] = await addNewMessage(groupId, null, errorMessage, 'ai');

                const messagePayload = {
                    id: savedMessage.id,
                    groupId: savedMessage.groupId,
                    content: savedMessage.content,
                    createdAt: savedMessage.createdAt,
                    senderType: 'ai',
                    sender: null
                };

                getIO().to(groupId).emit('new_message', messagePayload);
            } catch (dbErr) {
                console.error("Failed to save AI error message to DB: ", dbErr);
            }

            getIO().to(groupId).emit('ai_typing', { groupId, isTyping: false });
        }
        throw err;
    }
}