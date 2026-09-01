// backend/src/services/handlers/google-calendar.ts
import db from '../../db/connection'
import { googleCalendarTokens } from '../../db/schema'
import { events }               from '../../db/schema'
import { eq, and }              from 'drizzle-orm'
import env                      from '../../config/env'

const GOOGLE_TOKEN_URL    = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_URL = 'https://www.googleapis.com/calendar/v3'

// Map Google event categories → your EventType enum
const TYPE_MAP: Record<string, 'assignment' | 'quiz' | 'mid' | 'final' | 'project' | 'study' | 'general'> = {
    assignment:   'assignment',
    homework:     'assignment',

    quiz:         'quiz',
    test:         'quiz',

    mid:          'mid',
    midterm:      'mid',

    final:        'final',
    finals:       'final',

    project:      'project',
    eval:         'project',
    evaluation:   'project',
    presentation: 'project',

    study:        'study',
    revision:     'study',
    practice:     'study',
}

function detectType(title: string): 'assignment' | 'quiz' | 'mid' | 'final' | 'project' | 'study' | 'general' {
    const lower = title.toLowerCase()
    for (const [keyword, type] of Object.entries(TYPE_MAP)) {
        if (lower.includes(keyword)) return type
    }
    return 'general' // default
}

// ---- Token management -------------------------------------------------------

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id:     env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type:    'refresh_token',
        }),
    })

    if (!res.ok) throw new Error('Failed to refresh Google access token')

    const data = await res.json() as { access_token: string; expires_in: number }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000)
    await db.update(googleCalendarTokens)
        .set({ accessToken: data.access_token, expiresAt, updatedAt: new Date() })
        .where(eq(googleCalendarTokens.userId, userId))

    return data.access_token
}

async function getValidAccessToken(userId: string): Promise<string> {
    const [row] = await db.select()
        .from(googleCalendarTokens)
        .where(eq(googleCalendarTokens.userId, userId))
        .limit(1)

    if (!row) throw new Error('Google Calendar not connected. Please connect first.')

    // Refresh if expires in < 5 minutes
    if (row.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
        return refreshAccessToken(userId, row.refreshToken)
    }

    return row.accessToken
}

// ---- OAuth ------------------------------------------------------------------

export function buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id:     env.GOOGLE_CLIENT_ID,
        redirect_uri:  env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events.readonly',
        ].join(' '),
        access_type:   'offline',
        prompt:        'consent',          // force refresh_token every time
        state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCodeForTokens(
    code: string,
    userId: string
): Promise<void> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id:     env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri:  env.GOOGLE_REDIRECT_URI,
            grant_type:    'authorization_code',
        }),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Token exchange failed: ${err}`)
    }

    const data = await res.json() as {
        access_token:  string
        refresh_token: string
        expires_in:    number
    }

    if (!data.refresh_token) throw new Error('No refresh token returned. Revoke app access in Google and try again.')

    const expiresAt = new Date(Date.now() + data.expires_in * 1000)

    // Upsert — one row per user
    await db.insert(googleCalendarTokens)
        .values({
            userId,
            accessToken:  data.access_token,
            refreshToken: data.refresh_token,
            expiresAt,
        })
        .onConflictDoUpdate({
            target: googleCalendarTokens.userId,
            set: {
                accessToken:  data.access_token,
                refreshToken: data.refresh_token,
                expiresAt,
                updatedAt:    new Date(),
            },
        })
}

// ---- Sync -------------------------------------------------------------------

interface GoogleCalendarEvent {
    id:      string
    summary: string
    start:   { dateTime?: string; date?: string }
    end:     { dateTime?: string; date?: string }
    description?: string
}

export async function syncGoogleCalendarEvents(userId: string): Promise<{
    imported: number
    skipped:  number
}> {
    const accessToken = await getValidAccessToken(userId)

    // Pull events from now to 90 days ahead
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const url = `${GOOGLE_CALENDAR_URL}/calendars/primary/events?` + new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents:  'true',
        orderBy:       'startTime',
        maxResults:    '100',
    })

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Google Calendar fetch failed: ${err}`)
    }

    const data = await res.json() as { items: GoogleCalendarEvent[] }
    const calendarEvents = data.items ?? []

    let imported = 0
    let skipped  = 0

    for (const gEvent of calendarEvents) {
        // Skip events with no title or all-day events without a clear deadline nature
        if (!gEvent.summary) { skipped++; continue }

        const rawDate = gEvent.start.dateTime ?? gEvent.start.date
        if (!rawDate) { skipped++; continue }

        const eventDate = new Date(rawDate)
        if (isNaN(eventDate.getTime())) { skipped++; continue }

        // Extract time if dateTime (not all-day date)
        let time: string | null = null
        if (gEvent.start.dateTime) {
            const d = new Date(gEvent.start.dateTime)
            time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        }

        const title     = gEvent.summary.trim()
        const eventType = detectType(title)

        // Try to extract course name from description "Course: XYZ" or use event title
        let course = 'General'
        if (gEvent.description) {
            const match = gEvent.description.match(/course[:\s]+([^\n]+)/i)
            if (match) course = match[1].trim()
        }

        // Check if this google event is already imported (match on userId + title + date)
        const existing = await db.select({ id: events.id })
            .from(events)
            .where(
                and(
                    eq(events.userId, userId),
                    eq(events.title, title),
                )
            )
            .limit(1)

        if (existing.length > 0) { skipped++; continue }

        await db.insert(events).values({
            userId,
            title,
            course,
            type:     eventType,
            priority: 'medium',
            date:     eventDate,
            time,
        })

        imported++
    }

    return { imported, skipped }
}

export async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
    const [row] = await db.select({ id: googleCalendarTokens.id })
        .from(googleCalendarTokens)
        .where(eq(googleCalendarTokens.userId, userId))
        .limit(1)
    return !!row
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
    await db.delete(googleCalendarTokens)
        .where(eq(googleCalendarTokens.userId, userId))
}