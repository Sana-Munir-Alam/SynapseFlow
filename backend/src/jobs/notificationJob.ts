/**
 * notificationJob.ts
 *
 * Runs once per day (via node-cron or a simple setInterval at startup).
 * Finds all events due tomorrow and inserts a notification for each owner.
 *
 * Install: npm install node-cron
 * Types:   npm install -D @types/node-cron
 *
 * Wire it up in your main server entry point:
 *   import './jobs/notificationJob'
 */

import cron from 'node-cron'
import { getEventsDueTomorrow, insertNotification, notificationExistsForEventToday } from '../services/dal/scheduler.dal'

const runJob = async () => {
    try {
        const events = await getEventsDueTomorrow()
        console.log(`[NotificationJob] Found ${events.length} event(s) due tomorrow`)

        for (const event of events) {
            // Skip if a notification for this event was already sent today
            const alreadySent = await notificationExistsForEventToday(event.id)
            if (alreadySent) {
                console.log(`[NotificationJob] Skipping duplicate for event: ${event.title}`)
                continue
            }

            const dateStr = new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric'
            })
            const message = `⏰ Reminder: "${event.title}" (${event.course}) is due tomorrow — ${dateStr}`
            await insertNotification(event.userId, message, event.id)
        }
    } catch (err) {
        console.error('[NotificationJob] Error:', err)
    }
}

// Run every day at 8:00 AM server time
cron.schedule('0 8 * * *', () => {
    console.log('[NotificationJob] Running daily deadline check...')
    runJob()
})

console.log('[NotificationJob] Scheduled — runs daily at 08:00')