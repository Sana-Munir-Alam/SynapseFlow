import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import { validateBody } from '../middleware/validation.middleware';
import { verifyToken } from '../middleware/verifyToken.middleware';
import { getCopilotHistory, handleChatbotMessage, transcribeVoiceMessage } from '../controllers/chatbot.controller';
import { insertChatbotMessageSchema } from '../db/schema/chatbot_messages.schema';
import { aiRateLimiter } from '../middleware/ai-rate-limiter.middleware';
const router = express.Router();

const chatbotMessageBodySchema = insertChatbotMessageSchema.pick({ content: true }).extend({
    docs: z.boolean().optional()
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.post('/', verifyToken, validateBody(chatbotMessageBodySchema), aiRateLimiter, handleChatbotMessage)
router.get('/history', verifyToken, getCopilotHistory)
router.post('/transcribe', verifyToken, aiRateLimiter, upload.single('audio'), transcribeVoiceMessage)
export default router;