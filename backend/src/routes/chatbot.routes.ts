import express from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.middleware';
import { verifyToken } from '../middleware/verifyToken.middleware';
import { getCopilotHistory, handleChatbotMessage } from '../controllers/chatbot.controller';
import { insertChatbotMessageSchema } from '../db/schema/chatbot_messages.schema';
import { aiRateLimiter } from '../middleware/ai-rate-limiter.middleware';
const router = express.Router();

const chatbotMessageBodySchema = insertChatbotMessageSchema.pick({ content: true }).extend({
    docs: z.boolean().optional()
});

router.post('/', verifyToken, validateBody(chatbotMessageBodySchema), aiRateLimiter, handleChatbotMessage)
router.get('/history', verifyToken, getCopilotHistory)

export default router;