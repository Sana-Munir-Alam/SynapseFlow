import { DAYS } from './constants'
import type { Priority } from '../../services/scheduler.service'

export function generateWeeklyPlan(priority: Priority, preparation: number) {
  const total = priority === 'high' ? 20 : priority === 'medium' ? 15 : 10
  const adjusted = total * (1 - preparation / 100) + 2
  const perDay = adjusted / 7
  return DAYS.map(dayOfWeek => ({
    dayOfWeek,
    hours: Math.max(0.5, Math.round((Math.random() * 0.5 + 0.75) * perDay * 10) / 10),
  }))
}

/** Returns the Monday of the current week as "YYYY-MM-DD" in LOCAL time.
 *  Uses local date math (not UTC) so users in UTC+ timezones past midnight
 *  get the correct local week start instead of the previous UTC day. */
export function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay()                    // 0=Sun, local
  const diff = day === 0 ? -6 : 1 - day      // shift to Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  // Format in LOCAL time — NOT toISOString() which gives UTC date
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}