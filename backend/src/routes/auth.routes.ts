import express from 'express';
import { forgotPassword, getCurrentUser, login, logout, register, resetPassword } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validation.middleware';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../zod/schema';
import { verifyToken } from '../middleware/verifyToken.middleware';
import { deleteAccount } from '../controllers/auth.controller'

const router = express.Router();

router.post('/register', validateBody(registerSchema), register)
router.post('/login', validateBody(loginSchema), login)
router.post('/logout', logout)
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword)
router.get('/me', verifyToken, getCurrentUser)
router.delete('/account', verifyToken, deleteAccount)

export default router;