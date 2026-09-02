import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req) => {
        const forwarded = req.headers['x-forwarded-for']
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim()
        }
        return ipKeyGenerator(req.ip ?? 'unknown')
    },

    message: {
        message: 'Too many attempts. Please try again in a few minutes.',
    },
})