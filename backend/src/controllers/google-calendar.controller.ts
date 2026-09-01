import type { Request, Response } from 'express'
import { buildAuthUrl, exchangeCodeForTokens, syncGoogleCalendarEvents, isGoogleCalendarConnected, disconnectGoogleCalendar, } from '../services/handlers/google-calendar'
import env from '../config/env'

/* GET /dashboard/scheduler/google/auth-url Returns the Google OAuth consent URL. Frontend redirects user there. */
export const getAuthUrl = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        // State = userId so we know who to save tokens for after redirect
        const state  = Buffer.from(JSON.stringify({ userId })).toString('base64url')
        const url    = buildAuthUrl(state)
        return res.status(200).json({ url })
    } catch (err) {
        console.error('[GCal] getAuthUrl error:', err)
        return res.status(500).json({ message: 'Failed to generate auth URL' })
    }
}

/**
 * GET /scheduler/google/callback
 * Google redirects here after user grants permission.
 * Exchanges code for tokens, saves them, redirects back to frontend scheduler page.
 * NOTE: verifyToken middleware NOT used here — auth via the state param instead.
 */
export const handleOAuthCallback = async (req: Request, res: Response) => {
    try {
        const { code, state, error } = req.query as Record<string, string>

        if (error) {
            return res.redirect(`${env.APP_URL}/dashboard/scheduler?gcal=error&reason=${error}`)
        }

        if (!code || !state) {
            return res.redirect(`${env.APP_URL}/dashboard/scheduler?gcal=error&reason=missing_params`)
        }

        let userId: string
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
            userId = decoded.userId
            if (!userId) throw new Error('No userId in state')
        } catch {
            return res.redirect(`${env.APP_URL}/dashboard/scheduler?gcal=error&reason=invalid_state`)
        }

        await exchangeCodeForTokens(code, userId)

        return res.redirect(`${env.APP_URL}/dashboard/scheduler?gcal=connected`)
    } catch (err: any) {
        console.error('[GCal] callback error:', err)
        return res.redirect(`${env.APP_URL}/dashboard/scheduler?gcal=error&reason=token_exchange`)
    }
}

/**
 * POST /scheduler/google/sync
 * Pulls user's Google Calendar events and upserts them into the events table.
 */
export const syncCalendar = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const result = await syncGoogleCalendarEvents(userId)
        return res.status(200).json({
            message: `Sync complete. ${result.imported} imported, ${result.skipped} skipped.`,
            ...result,
        })
    } catch (err: any) {
        console.error('[GCal] sync error:', err)
        return res.status(500).json({ message: err?.message ?? 'Sync failed' })
    }
}

/**
 * GET /scheduler/google/status
 * Returns whether the user has connected Google Calendar.
 */
export const getConnectionStatus = async (req: Request, res: Response) => {
    try {
        const userId   = req.user!.id
        const connected = await isGoogleCalendarConnected(userId)
        return res.status(200).json({ connected })
    } catch (err) {
        console.error('[GCal] status error:', err)
        return res.status(500).json({ message: 'Failed to check status' })
    }
}

/**
 * DELETE /scheduler/google/disconnect
 * Removes stored tokens — user will need to re-auth to use again.
 */
export const disconnect = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        await disconnectGoogleCalendar(userId)
        return res.status(200).json({ message: 'Google Calendar disconnected' })
    } catch (err) {
        console.error('[GCal] disconnect error:', err)
        return res.status(500).json({ message: 'Failed to disconnect' })
    }
}