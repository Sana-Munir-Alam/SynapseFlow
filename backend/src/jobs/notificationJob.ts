import cron from 'node-cron'
import { getBehindStudyPlanSessions, getEventsDueTomorrowWithUsers, insertNotification, notificationExistsForEventToday, notificationExistsForStudyPlanLog, } from '../services/dal/scheduler.dal'
import { sendImportantEventReminderEmail, sendStudyPlanBehindReminderEmail,} from '../utils/mailer'
import { emitNewNotification } from '../lib/emitNewNotification'

const IMPORTANT_EVENT_TYPES = new Set(['assignment', 'quiz', 'mid', 'final', 'project',])

const getDisplayName = (firstName: string | null, username: string | null) => {
    return (firstName?.trim() || username?.trim() || 'Student')
}

const runDeadlineReminderJob = async () => {
    const events = await getEventsDueTomorrowWithUsers()
    console.log(`[NotificationJob] Found ${events.length} event(s) due tomorrow`)

    for (const event of events) {
        const isImportant = IMPORTANT_EVENT_TYPES.has(event.type)

        // "general" and "study" do not generate deadline notifications or emails.
        if (!isImportant) {continue}

        const alreadySent = await notificationExistsForEventToday(event.id)

        if (alreadySent) {
            console.log(`[NotificationJob] Skipping duplicate event: ${event.title}`)
            continue
        }

        const dateStr =
            new Date(event.date).toLocaleDateString(
                'en-US',
                {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                }
            )

        const message = `Reminder: "${event.title}" (${event.course}) is due tomorrow — ${dateStr}`

        // In-app notification.
        const createdNotification = await insertNotification(
            event.userId,
            message,
            {
                eventId: event.id,
            }
        )
        emitNewNotification(event.userId, createdNotification)
        // Email for important academic events only.
        try {
            await sendImportantEventReminderEmail(
                event.email,
                getDisplayName(event.firstName, event.username),
                {
                    title: event.title,
                    course: event.course,
                    type: event.type as
                        | 'assignment'
                        | 'quiz'
                        | 'mid'
                        | 'final'
                        | 'project',
                    date: dateStr,
                }
            )
        } catch (error) {
            console.error(
                `[NotificationJob] Failed to send event email for "${event.title}":`,
                error
            )
        }
    }
}


const runStudyPlanReminderJob = async () => {
    const sessions = await getBehindStudyPlanSessions(3)

    console.log(
        `[NotificationJob] Found ${sessions.length} behind-plan session(s)`
    )

    for (const session of sessions) {
        const alreadySent = await notificationExistsForStudyPlanLog(session.id)
        if (alreadySent) { continue }
        const isMissed = session.status === 'missed'
        const message = isMissed
            ? `Study plan reminder: You missed your ${session.scheduledHours}-hour ${session.course} study session. Review your plan and get back on track.`
            : `Study plan reminder: You completed less than your planned ${session.scheduledHours} hours for ${session.course}. Review your plan and get back on track.`

        // Create the in-app notification first.
        const createdNotification = await insertNotification(
            session.userId,
            message,
            { studyPlanLogId: session.id,}
        )
        emitNewNotification(session.userId, createdNotification)

        // Then attempt email. Email failure should not
        // remove or undo the in-app notification.
        try {
            await sendStudyPlanBehindReminderEmail(
                session.email,
                getDisplayName(
                    session.firstName,
                    session.username
                ),
                session.course,
                session.status as
                    | 'missed'
                    | 'less_than',
                session.scheduledHours
            )
        } catch (error) {
            console.error(`[NotificationJob] Failed to send study reminder email for ${session.userId}:`, error)
        }
    }
}


const runJob = async () => {
    try {
        await runDeadlineReminderJob()
        await runStudyPlanReminderJob()
    } catch (error) {
        console.error('[NotificationJob] Error:', error)
    }
}

// Run every day at 8:00 AM server time
cron.schedule('0 9 * * *', () => {
    console.log('[NotificationJob] Running daily deadline check...')
    runJob()
})

console.log('[NotificationJob] Scheduled — runs daily at 08:00')