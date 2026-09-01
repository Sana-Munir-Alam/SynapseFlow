import { api } from '../lib/axios'

export type AchievementCategory = 'schedule' | 'mcq' | 'flashcard' | 'streak' | 'engagement'

export interface ProgressSummary {
  scheduleCompletionRate: number
  completedScheduledSessions: number   // complete + greater_than
  totalScheduledSessions: number
  missedScheduledSessions: number      // missed only
  lessThanScheduledSessions: number    // less_than only
  currentWeekCompletionRate: number
  mcqAccuracy: number
  mcqAttempts: number
  flashcardMasteryRate: number
  flashcardsReviewed: number
  currentStreak: number
  longestStreak: number
  filesUploaded: number
  coursesCreated: number
  badgesEarned: number
  totalBadges: number
}

export interface MonthlyProgressPoint {
  month: string
  scheduled: number
  completed: number
  missed: number
  completionRate: number
  mcqAttempts: number
  mcqAccuracy: number
  flashcardsReviewed: number
  flashcardMastery: number
}

export interface DailyActivityPoint {
  date: string
  activityCount: number
}

export interface CourseProgressBreakdown {
  courseId: string
  courseName: string
  filesCount: number
  flashcardsCount: number
  flashcardMastery: number
  mcqsCount: number
  mcqAttempts: number
  mcqAccuracy: number
}

export interface ProgressBadge {
  id: string
  slug: string
  title: string
  description: string
  category: AchievementCategory
  icon: string
  targetValue: number
  progressValue: number
  earned: boolean
  earnedAt: string | null
}

export interface ProgressOverview {
  summary: ProgressSummary
  monthly: MonthlyProgressPoint[]
  dailyActivity: DailyActivityPoint[]
  courseBreakdown: CourseProgressBreakdown[]
  badges: ProgressBadge[]
}

export const fetchProgressOverview = async (): Promise<ProgressOverview> => {
  const res = await api.get('/progress')
  return res.data
}