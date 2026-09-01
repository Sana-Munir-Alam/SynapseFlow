import { Router } from 'express';
import { deleteForEveryone, deleteForMe, getMessages, sendMessage } from '../controllers/messages.controller';
import {
    getMessagesQuerySchema,
    groupParamsSchema,
    messageParamsSchema,
    sendMessageBodySchema,
} from '../db/schema/messages.schema';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { verifyToken } from '../middleware/verifyToken.middleware';
import { aiRateLimiter } from '../middleware/ai-rate-limiter.middleware';

const router = Router({ mergeParams: true });

router.use(verifyToken);

router.post(
    '/',
    validateParams(groupParamsSchema),
    validateBody(sendMessageBodySchema),
    (req, res, next) => {
        const content = req.body?.content;
        if (content?.startsWith('@ai')) {
            return aiRateLimiter(req, res, next);
        }
        return next();
    },
    sendMessage
);

router.get(
    '/',
    validateParams(groupParamsSchema),
    validateQuery(getMessagesQuerySchema),
    getMessages
);

router.delete(
    '/:messageId',
    validateParams(messageParamsSchema),
    deleteForMe
);

router.delete(
    '/:messageId/everyone',
    validateParams(messageParamsSchema),
    deleteForEveryone
);

export default router;