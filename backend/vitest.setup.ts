// Fake-but-valid env values so config/env.ts's Zod validation passes
// during tests. These are never used to hit a real DB/API — nothing
// in the tests below makes a real network or database call.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-gemini-key'
process.env.MAIL_SENDER = 'test@example.com'
process.env.GOOGLE_CLIENT_ID = 'test-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
process.env.BCRYPT_ROUNDS = '6'
process.env.NODE_ENV = 'development'
