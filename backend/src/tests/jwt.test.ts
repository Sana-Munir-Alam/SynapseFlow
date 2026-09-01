import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { generateToken } from '../utils/jwt'
import env from '../config/env'

describe('jwt utils', () => {
    const payload = { id: 'user-123', username: 'sana', email: 'sana@example.com' }

    it('generates a token that verifies correctly with the same secret', () => {
        const token = generateToken(payload)
        const decoded = jwt.verify(token, env.JWT_SECRET) as typeof payload
        expect(decoded.id).toBe(payload.id)
        expect(decoded.username).toBe(payload.username)
        expect(decoded.email).toBe(payload.email)
    })

    it('rejects a token verified against the wrong secret', () => {
        const token = generateToken(payload)
        expect(() => jwt.verify(token, 'a-completely-different-secret')).toThrow()
    })

    it('rejects a tampered token', () => {
        const token = generateToken(payload)
        const tampered = token.slice(0, -2) + 'xx'
        expect(() => jwt.verify(tampered, env.JWT_SECRET)).toThrow()
    })
})