import crypto from "crypto";
import type { Request, Response } from "express";
import { newUser } from "../db/schema/user.schema";
import { deleteToken, getToken, insertToken } from "../services/dal/tokens.dal";
import { checkExistingUser, deleteUserById, getUserById, insertUser, updateUserPassword } from "../services/dal/users.dal";
import { compareHash, hashPassword, hashResetToken } from "../utils/hashing.utils";
import { generateToken } from "../utils/jwt";
import { sendForgotPasswordEmail } from "../utils/mailer";
import { deleteEmbeddingsByUser } from "../utils/rag.utils";

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

        const token = generateToken({
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username as string
        });

        const { password: _, ...userWithoutPassword } = existingUser;

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 1000 * 60 * 60 * 24
        });

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

export const logout = async (req: Request, res: Response) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });
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
            return res.status(400).json({
                message: "Invalid or expired reset token"
            })
        }

        // Check if token is expired
        if (new Date() > new Date(token.expiresAt)) {
            await deleteToken(token.id)
            return res.status(400).json({
                message: "Reset token has expired"
            })
        }

        // Update user password
        const hashedPassword = await hashPassword(password)
        await updateUserPassword(token.userId, hashedPassword)

        // Delete the used token
        await deleteToken(token.id)

        return res.status(200).json({
            message: "Password reset successfully"
        })
    }
    catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Failed to reset password"
        })
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
 
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });

        await deleteEmbeddingsByUser(req.user.id);
 
        return res.status(200).json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to delete account" });
    }
};