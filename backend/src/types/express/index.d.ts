declare global {
    namespace Express {
        interface UserPayload {
            id: string;
            username: string;
            email: string;
            iat?: number;
            exp?: number;
        }

        interface Request {
            user?: UserPayload;
        }
    }
}

// export {};
export type UserPayload = Express.UserPayload;