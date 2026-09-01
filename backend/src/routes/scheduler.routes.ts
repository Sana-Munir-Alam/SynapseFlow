import express from 'express'
import { verifyToken } from '../middleware/verifyToken.middleware'
import { aiRateLimiter } from '../middleware/ai-rate-limiter.middleware'
import { getEvents, createEvent, deleteEvent, getStudyPlan, saveStudyPlan, generateScheduleWithAI, getNotifications, markRead, deleteNotification, deleteAllNotifications, getPlanLogs, savePlanLogs, deleteCourseData, } from '../controllers/events.controller'
import { getAuthUrl, handleOAuthCallback, syncCalendar, getConnectionStatus, disconnect, } from '../controllers/google-calendar.controller'

const router = express.Router()

// Google OAuth callback — NO verifyToken (request comes from Google redirect)
router.get('/google/callback', handleOAuthCallback)

// All other routes require auth
router.use(verifyToken)

// Events
router.get('/events', getEvents)
router.post('/events', createEvent)
router.delete('/events/:id', deleteEvent)

// Study Plan
router.get('/study-plan',  getStudyPlan)
router.post('/study-plan', saveStudyPlan)

// AI Schedule Generation (rate-limited)
router.post('/ai-generate', aiRateLimiter, generateScheduleWithAI)

// Google Calendar
router.get('/google/auth-url', getAuthUrl)
router.get('/google/status', getConnectionStatus)
router.post('/google/sync', syncCalendar)
router.delete('/google/disconnect', disconnect)

// Study Plan Logs
router.get('/plan-logs', getPlanLogs)
router.post('/plan-logs', savePlanLogs)
router.delete('/plan-logs/delete-course', deleteCourseData)

// Notifications
router.get('/notifications', getNotifications)
router.patch('/notifications/:id/read', markRead)
router.delete('/notifications', deleteAllNotifications)
router.delete('/notifications/:id', deleteNotification)

export default router