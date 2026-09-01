import dotenv from 'dotenv'
dotenv.config({ quiet: true })

import { z } from 'zod'

const envSchema = z.object({
    APP_STAGE: z.enum(['dev', 'prod']).default('dev'),
    NODE_ENV:                     z.enum(['development', 'production']).default('development'),
    APP_URL:                      z.string().default('http://localhost:5173'),
    BACKEND_PORT:                 z.coerce.number().positive().default(8000),
    DATABASE_URL:                 z.string().startsWith("postgresql://"),
    JWT_SECRET:                   z.string().min(32),
    JWT_EXPIRY:                   z.string().default('7d'),
    BCRYPT_ROUNDS:                z.coerce.number().min(6).max(12).default(8),
    RESEND_API_KEY:               z.string(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
    GEMINI_MODEL:                 z.string().default('gemini-2.5-flash'),
    TEXT_EMBEDDING_MODEL:         z.string().default('gemini-embedding-001'),
    MAIL_SENDER:                  z.email(),
    CORS_ORIGIN: z
        .string()
        .or(z.array(z.string()))
        .transform((val) => {
            if (typeof val === 'string') return val.split(',').map(o => o.trim())
            return val
        })
        .default([]),
    // Google Calendar OAuth
    GOOGLE_CLIENT_ID:     z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_REDIRECT_URI:  z.string().default('http://localhost:8000/api/scheduler/google/callback'),
})

export type ENV = z.infer<typeof envSchema>

let env: ENV

try {
    env = envSchema.parse(process.env)
} catch (error) {
    if (error instanceof z.ZodError) {
        console.error("❌ Invalid environment variables:")
        for (const issue of error.issues) {
            console.error(`  ${issue.path.join(".")}: ${issue.message}`)
        }
        process.exit(1)
    } else {
        console.error('❌ Unexpected error loading environment:', error)
        process.exit(1)
    }
}

export const isProd = () => env.NODE_ENV === 'production'
export const isDev  = () => env.NODE_ENV === 'development'

export { env }
export default env