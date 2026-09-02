import express from 'express';
import { forgotPassword, getCurrentUser, login, logout, refresh, register, resetPassword } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validation.middleware';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../zod/schema';
import { verifyToken } from '../middleware/verifyToken.middleware';
import { deleteAccount } from '../controllers/auth.controller'
import {authRateLimiter} from '../middleware/rateLimiter.middleware'

const router = express.Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), register)
router.post('/login', authRateLimiter, validateBody(loginSchema), login)
router.post('/refresh', refresh) 
router.post('/logout', logout)
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword)
router.get('/me', verifyToken, getCurrentUser)
router.delete('/account', verifyToken, deleteAccount)

export default router;