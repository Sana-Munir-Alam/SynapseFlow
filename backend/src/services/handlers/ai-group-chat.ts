import { AIMessageType, fetchGeminiTextResponse, SAMPLE_CONVERSATION, executeAITaskWithSocketUpdates, withRetry } from "../../utils/ai-chatbot.utils";
import { AI_HELP_MESSAGE, STATIC_PROMPT } from "../../utils/data";
import { getGroupById } from "../dal/groups.dal";
import { fetchMessages } from "../dal/messages.dal";

export const handleGroupChatAIRequest = async (groupId: string, content: string) => {
    try {
        const response = await executeAITaskWithSocketUpdates(groupId, async () => {
            const [group] = await getGroupById(groupId);
            if (!group) throw new Error("Group not found");

            const messages: AIMessageType[] = [
                ...SAMPLE_CONVERSATION,
                { role: 'user', content: content }
            ];

            return await executeGroupChatCommand(messages, groupId, group.name);
        });

        return response;
    }
    catch (err) {
        console.error("AI Group Chat Error: ", err);
    }
}

const executeGroupChatCommand = async (messages: AIMessageType[], groupId: string, groupName: string) => {
    try {
        const prompt = buildGroupChatPrompt(groupName);
        let response: string;
        const args = messages[messages.length - 1].content.split(' ');
        const command = args[0].toLowerCase()

        if (command === 'help') {
            response = AI_HELP_MESSAGE;
        }
        else if (command === 'summarize') {
            const n = Number(args[1]);

            // Validating that the input is valid num
            if (!args[1] || isNaN(n) || n <= 0) {
                response = "Please provide a valid number of messages to summarize. (e.g. @ai summarize 10)";
            }
            else if (n > 20) {
                response = "I cannot summarize more than 20 messages"
            }
            else {
                const msgs = await fetchMessages(groupId, Number(n));

                const chatText = msgs.map(m => `${m.senderType}: ${m.content}`).join('\n')
                // Create a custom prompt just for summarization
                const summaryPrompt = `Please summarize the following chat history:\n\n${chatText}`;

                const summaryMessages: AIMessageType[] = [
                    { role: 'user', content: summaryPrompt }
                ];

                response = await withRetry(() => fetchGeminiTextResponse(summaryMessages, prompt));
            }
        }
        else {
            response = await withRetry(() => fetchGeminiTextResponse(messages, prompt));
        }
        return response;
    } catch (error) {
        console.log("Inner AI Group Chat Error: ", error);
        throw error;
    }
}


const buildGroupChatPrompt = (groupName: string) => {
    return `
${STATIC_PROMPT}

--- Group Context ---
Group Name: ${groupName}

Use the above information to personalize your responses.
Only refer to information explicitly listed above. Do not invent details.
    `.trim()
}