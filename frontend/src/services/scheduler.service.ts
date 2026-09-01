import { api } from '../lib/axios'

// ---- Types ----------------------------------------------------------------

export type EventType = 'assignment' | 'quiz' | 'mid' | 'final' | 'project' | 'study' | 'general'
export type Priority = 'low' | 'medium' | 'high'
export type StudyStatus = 'complete' | 'missed' | 'less_than' | 'greater_than'
export type DayStatus = StudyStatus | null

export interface CourseEntry {
  id?: string           // uuid from study_plan_courses — present after saving, absent on draft
  course: string
  preparation: number
  priority: Priority
  color: string
  weeklyPlan: { dayOfWeek: string; hours: number }[]  // normalized: dayOfWeek not day
}

export interface Event {
  id: string
  userId: string
  title: string
  course: string
  type: EventType
  priority: Priority
  date: string
  time?: string
  createdAt: string
}

export interface StudyPlan {
  id: string
  userId: string
  name: string
  courses: CourseEntry[]
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  userId: string
  eventId?: string
  message: string
  isRead: boolean
  createdAt: string
  event?: { title: string; date: string; course: string } | null
}

export interface StudyPlanLog {
  id: string
  userId: string
  studyPlanCourseId: string        // FK uuid — replaces course string
  weekStart: string
  dayOfWeek: number                // 0=Mon … 6=Sun
  scheduledHours: number
  status: DayStatus
  course: string                   // joined from study_plan_courses for display
  createdAt: string
  updatedAt: string
}

// ---- Events ---------------------------------------------------------------

export const fetchEvents = async (): Promise<Event[]> => {
  const res = await api.get('/scheduler/events')
  return res.data
}

export const createEvent = async (payload: Omit<Event, 'id' | 'userId' | 'createdAt'>): Promise<Event> => {
  const res = await api.post('/scheduler/events', payload)
  return res.data
}

export const deleteEvent = async (id: string): Promise<void> => {
  await api.delete(`/scheduler/events/${id}`)
}

// ---- Study Plans ----------------------------------------------------------

export const fetchStudyPlan = async (): Promise<StudyPlan | null> => {
  const res = await api.get('/scheduler/study-plan')
  return res.data
}

export const saveStudyPlan = async (payload: { name?: string; courses: CourseEntry[] }): Promise<StudyPlan> => {
  const res = await api.post('/scheduler/study-plan', payload)
  return res.data
}

// ---- Notifications --------------------------------------------------------

export const fetchNotifications = async (): Promise<Notification[]> => {
  const res = await api.get('/scheduler/notifications')
  return res.data
}

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/scheduler/notifications/${id}/read`)
}

export const deleteNotification = async (id: string): Promise<void> => {
  await api.delete(`/scheduler/notifications/${id}`)
}

export const deleteAllNotifications = async (): Promise<void> => {
  await api.delete('/scheduler/notifications')
}

// ---- Study Plan Logs ------------------------------------------------------

export const fetchPlanLogs = async (): Promise<StudyPlanLog[]> => {
  const res = await api.get('/scheduler/plan-logs')
  return res.data
}

/**
 * Save weekly log for one course.
 * studyPlanCourseId: the uuid of the study_plan_courses row (from CourseEntry.id)
 * scheduledHours and dayStatuses are 7-element arrays indexed 0=Mon … 6=Sun.
 */
/** Returns the Monday of the current week as "YYYY-MM-DD" using LOCAL date (not UTC). */
function getLocalWeekStart(): string {
  const now = new Date()
  const day = now.getDay()                    // 0=Sun
  const diff = day === 0 ? -6 : 1 - day      // shift to Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  // Format as YYYY-MM-DD in local time (NOT toISOString which gives UTC)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const savePlanLogs = async (payload: {
  studyPlanCourseId: string
  scheduledHours: number[]
  dayStatuses: DayStatus[]
}): Promise<StudyPlanLog[]> => {
  const res = await api.post('/scheduler/plan-logs', {
    ...payload,
    weekStart: getLocalWeekStart(),   // send local week start so backend stores under the right key
  })
  return res.data
}

/**
 * Delete a course row — cascade deletes its schedule and all log rows.
 */
export const deleteCourseData = async (payload: {
  studyPlanCourseId: string
}): Promise<void> => {
  await api.delete('/scheduler/plan-logs/delete-course', { data: payload })
}

// ---- AI Schedule Generation -----------------------------------------------

export interface AIScheduleInput {
  course: string
  preparation: number
  priority: Priority
}

export interface AIScheduleResult {
  course: string
  weeklyPlan: { dayOfWeek: string; hours: number }[]
  rationale: string
}

/* Ask the AI to generate a weekly study plan for `newCourses`, taking into account `existingCourses` already in the schedule and upcoming `events` (deadlines, quizzes, etc.). */
export const generateAIStudyPlan = async (payload: {
  newCourses: AIScheduleInput[]
  existingCourses: AIScheduleInput[]
  events: Pick<Event, 'title' | 'course' | 'type' | 'date' | 'time'>[]
}): Promise<AIScheduleResult[]> => {
  const res = await api.post('/scheduler/ai-generate', payload)
  return res.data.schedules
}

// ---- Google Calendar -------------------------------------------------------

export const fetchGCalStatus = async (): Promise<{ connected: boolean }> => {
    const res = await api.get('/scheduler/google/status')
    return res.data
}

export const fetchGCalAuthUrl = async (): Promise<{ url: string }> => {
    const res = await api.get('/scheduler/google/auth-url')
    return res.data
}

export const syncGoogleCalendar = async (): Promise<{ imported: number; skipped: number; message: string }> => {
    const res = await api.post('/scheduler/google/sync')
    return res.data
}

export const disconnectGoogleCalendar = async (): Promise<void> => {
    await api.delete('/scheduler/google/disconnect')
}