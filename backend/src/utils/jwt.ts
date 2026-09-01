import jwt from 'jsonwebtoken'
import env from '../config/env'

type JwtPayload = {
    id: string,
    username: string,
    email: string
}

export const generateToken = (payload: JwtPayload): string => {
    const secret = env.JWT_SECRET
    const expiry = env.JWT_EXPIRY as jwt.SignOptions['expiresIn']

    return jwt.sign(payload, secret, { expiresIn: expiry })
}