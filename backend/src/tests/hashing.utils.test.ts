import { describe, it, expect } from 'vitest'
import { hashPassword, compareHash, hashResetToken } from '../utils/hashing.utils'

describe('hashing.utils', () => {
    it('hashes a password to something different from the plaintext', async () => {
        const hash = await hashPassword('correct horse battery staple')
        expect(hash).not.toBe('correct horse battery staple')
        expect(hash.length).toBeGreaterThan(20)
    })

    it('verifies a correct password against its hash', async () => {
        const hash = await hashPassword('my-secret-pw')
        expect(await compareHash('my-secret-pw', hash)).toBe(true)
    })

    it('rejects an incorrect password against a hash', async () => {
        const hash = await hashPassword('my-secret-pw')
        expect(await compareHash('wrong-password', hash)).toBe(false)
    })

    it('produces a different hash each time for the same password (bcrypt salting)', async () => {
        const hash1 = await hashPassword('same-input')
        const hash2 = await hashPassword('same-input')
        expect(hash1).not.toBe(hash2)
    })

    it('hashResetToken is deterministic for the same input', () => {
        expect(hashResetToken('abc123')).toBe(hashResetToken('abc123'))
    })

    it('hashResetToken differs for different input', () => {
        expect(hashResetToken('token-a')).not.toBe(hashResetToken('token-b'))
    })
})