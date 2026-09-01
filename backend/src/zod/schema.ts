import z from "zod"
import { insertUserSchema } from "../db/schema/user.schema"

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(6).max(15)
})

export const registerSchema = insertUserSchema.extend({
    password: z.string().min(6).max(50),
    email: z.email().toLowerCase(),
    username: z.string().min(3).max(20).optional()
})

export const forgotPasswordSchema = z.object({
    email: z.email()
})

export const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(6)
})