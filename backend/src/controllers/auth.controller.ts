import crypto from "crypto";
import type { Request, Response } from "express";
import { newUser } from "../db/schema/user.schema";
import { deleteToken, getToken, insertToken } from "../services/dal/tokens.dal";
import { consumeRefreshToken, deleteRefreshToken, deleteRefreshTokensByUser, insertRefreshToken } from "../services/dal/refreshTokens.dal";
import { checkExistingUser, deleteUserById, getUserById, insertUser, updateUserPassword } from "../services/dal/users.dal";
import { compareHash, hashPassword, hashResetToken } from "../utils/hashing.utils";
import { generateToken } from "../utils/jwt";
import { sendForgotPasswordEmail } from "../utils/mailer";
import { deleteEmbeddingsByUser } from "../utils/rag.utils";
import env, { isProd } from "../config/env";

import { parseExpiryToMs } from "../utils/duration.utils";
const ACCESS_TOKEN_COOKIE_MAX_AGE = parseExpiryToMs(env.ACCESS_TOKEN_EXPIRY)
const REFRESH_TOKEN_COOKIE_MAX_AGE = env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000

const authCookieOptions = () => ({
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? ('none' as const) : ('lax' as const),
})

// Issues both cookies for a given user and stores the hashed refresh token.
async function issueSession(res: Response, user: { id: string; email: string; username: string | null }) {
    const accessToken = generateToken({
        id: user.id,
        email: user.email,
        username: user.username as string,
    })

    const rawRefreshToken = crypto.randomBytes(40).toString('hex')
    const hashedRefreshToken = hashResetToken(rawRefreshToken) // generic SHA-256 hash, same one used for password-reset tokens
    await insertRefreshToken(user.id, hashedRefreshToken)

    res.cookie('token', accessToken, { ...authCookieOptions(), maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE })
    res.cookie('refreshToken', rawRefreshToken, { ...authCookieOptions(), maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE })
}

export const register = async (req: Request<any, any, newUser>, res: Response) => {
    try {
        const existingUser = await checkExistingUser(req.body.email)

        if (existingUser) {
            return res.status(409).json({
                message: "Email already in use"
            })
        }

        const hashedPassword = await hashPassword(req.body.password)

        const user = await insertUser({ ...req.body }, hashedPassword)

        const { password, ...userWithoutPassword } = user;

        return res.status(201).json({
            message: 'User created successfully',
            user: userWithoutPassword
        })
    }
    catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "User creation failed"
        })
    }
}

export const login = async (req: Request, res: Response) => {
    console.log({
        ip: req.ip,
        ips: req.ips,
        xForwardedFor: req.headers['x-forwarded-for'],
        xRealIp: req.headers['x-real-ip'],
    });
    try {
        const { email, password } = req.body
        const existingUser = await checkExistingUser(email)

        if (!existingUser) {
            return res.status(401).json({
                message: "Invalid Credentials"
            })
        }

        const isPasswordValid = await compareHash(password, existingUser.password)

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid Credentials"
            })
        }

        const { password: _, ...userWithoutPassword } = existingUser;

        await issueSession(res, existingUser)

        res.status(200).json({
            message: 'User logged-in successfully',
            user: userWithoutPassword,
        });
    }
    catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Login failed"
        })
    }
}

export const refresh = async (req: Request, res: Response) => {
    try {
        const rawRefreshToken = req.cookies?.refreshToken
        if (!rawRefreshToken) {
            return res.status(401).json({ message: 'No refresh token provided' })
        }

        const hashedToken = hashResetToken(rawRefreshToken)

        // Atomic consume: the DELETE itself is the check. If two requests race
        // on the same token, only one gets a row back here — the loser gets [].
        const [consumed] = await consumeRefreshToken(hashedToken)

        if (!consumed) {
            return res.status(401).json({ message: 'Invalid refresh token' })
        }

        if (new Date() > new Date(consumed.expiresAt)) {
            // Already deleted by the consume above — nothing left to clean up.
            return res.status(401).json({ message: 'Refresh token expired' })
        }

        const user = await getUserById(consumed.userId)
        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' })
        }

        await issueSession(res, user)
        return res.status(200).json({ message: 'Token refreshed' })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to refresh token' })
    }
}

export const logout = async (req: Request, res: Response) => {
    try {
        const rawRefreshToken = req.cookies?.refreshToken
        if (rawRefreshToken) {
            const hashedToken = hashResetToken(rawRefreshToken)
            await consumeRefreshToken(hashedToken) // deletes it if it exists; no-op if it doesn't
        }

        res.clearCookie('token', authCookieOptions());
        res.clearCookie('refreshToken', authCookieOptions());

        return res.status(200).json({
            message: 'User logged-out successfully',
        });
    }
    catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Logout failed"
        })
    }
}

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const existingUser = await checkExistingUser(email);

        // Don't reveal if the user exists
        if (!existingUser) {
            return res.status(200).json({
                message: "If an account exists, a reset email has been sent"
            });
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = hashResetToken(rawToken);

        await insertToken(existingUser.id, hashedToken);

        // Respond immediately
        res.status(200).json({
            message: "If an account exists, a reset email has been sent"
        });

        // Send email in background
        sendForgotPasswordEmail(existingUser.email, existingUser.username as string, rawToken)
            .catch(err => console.error("Email failed:", err));

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Failed to process password reset"
        });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token: rawToken, password } = req.body
        const hashedToken = hashResetToken(rawToken)

        const [token] = await getToken(hashedToken)

        if (!token) {
            return res.status(400).json({ message: "Invalid or expired reset token" })
        }

        if (new Date() > new Date(token.expiresAt)) {
            await deleteToken(token.id)
            return res.status(400).json({ message: "Reset token has expired" })
        }

        const hashedPassword = await hashPassword(password)
        await updateUserPassword(token.userId, hashedPassword)
        await deleteRefreshTokensByUser(token.userId)   // ADDED — kills every existing session, stolen or not
        await deleteToken(token.id)

        return res.status(200).json({ message: "Password reset successfully" })
    }
    catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Failed to reset password" })
    }
}

export const getCurrentUser = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });

        const currentUser = await getUserById(req.user.id);

        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({ user: currentUser });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Current user retrieval failed" });
    }
};

export const deleteAccount = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
 
        const deleted = await deleteUserById(req.user.id);
 
        if (!deleted) {
            return res.status(404).json({ message: "User not found" });
        }
 
        res.clearCookie('token', authCookieOptions());
        res.clearCookie('refreshToken', authCookieOptions());

        await deleteEmbeddingsByUser(req.user.id);
 
        return res.status(200).json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to delete account" });
    }
};