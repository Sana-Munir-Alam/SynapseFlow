import bcrypt from 'bcrypt'
import crypto from 'crypto'
import env from '../config/env'

export const hashPassword = async (raw: string): Promise<string> => {
    try {
        const saltRounds = env.BCRYPT_ROUNDS || 12
        return await bcrypt.hash(raw, saltRounds)
    }
    catch (err) {
        throw new Error('Bcrypt hashing failed')
    }
}

export const compareHash = async (raw: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(raw, hash)
}

export const hashResetToken = (raw: string): string => {
    return crypto.createHash('sha256').update(raw).digest('hex')
}