import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validateBody } from '../middleware/validation.middleware'

const schema = z.object({
    email: z.email(),
    password: z.string().min(8),
})

function mockRes() {
    const res: any = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
}

describe('validateBody middleware', () => {
    it('calls next() when the body is valid', () => {
        const req: any = { body: { email: 'sana@example.com', password: 'longenough' } }
        const res = mockRes()
        const next = vi.fn()

        validateBody(schema)(req, res, next)

        expect(next).toHaveBeenCalledOnce()
        expect(res.status).not.toHaveBeenCalled()
    })

    it('responds 400 with field-level details on invalid input', () => {
        const req: any = { body: { email: 'not-an-email', password: '123' } }
        const res = mockRes()
        const next = vi.fn()

        validateBody(schema)(req, res, next)

        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
        const payload = res.json.mock.calls[0][0]
        expect(payload.error).toBe('Validation failed')
        expect(payload.details.some((d: any) => d.field === 'email')).toBe(true)
        expect(payload.details.some((d: any) => d.field === 'password')).toBe(true)
    })
})