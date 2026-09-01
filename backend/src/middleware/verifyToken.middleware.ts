import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env";;
import type { } from "../types/express";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        req.user = verifyJWT(token);
        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) return res.status(401).json({ error: "Token expired" });
        if (err instanceof jwt.JsonWebTokenError) return res.status(401).json({ error: "Invalid token" });
        next(err);
    }
};

export const verifyJWT = (token: string) => {
    const decoded = jwt.verify(token, env.JWT_SECRET) as Express.UserPayload
    return decoded
}