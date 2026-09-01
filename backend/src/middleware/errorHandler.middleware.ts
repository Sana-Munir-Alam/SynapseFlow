import type { Request, Response, NextFunction } from 'express'
import { isProd } from '../config/env'

// Catches any request that didn't match a route above it.
// Must be registered AFTER all app.use('/api/...') route mounts.
export const notFoundHandler = (req: Request, res: Response) => {
    return res.status(404).json({
        message: `Route ${req.method} ${req.originalUrl} not found`,
    })
}

// Catches anything thrown or passed to next(err) anywhere upstream.
// Must be registered LAST, after notFoundHandler.
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}`, err)

    // If a response has already started streaming (e.g. chatbot SSE),
    // we can't send a fresh JSON body — hand off to Express's default handler.
    if (res.headersSent) {
        return next(err)
    }

    const status = err.status || err.statusCode || 500

    return res.status(status).json({
        message: status === 500 ? 'Internal server error' : (err.message || 'Something went wrong'),
        // Stack traces only in non-prod, never leak internals to real users.
        ...(!isProd() && { stack: err.stack }),
    })
}