import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { useProgress } from '../hooks/useProgress'
import { useRealtimeProgress } from '../hooks/useRealtimeProgress'

// Components
import { Card } from '../components/Progress/Common'
import { ProgressStats } from '../components/Progress/ProgressStats'
import { SessionBreakdown, MonthlyChart, TrendPanel } from '../components/Progress/SessionAnalytics'
import { CompletionRates, EngagementCard, CoursePerformanceTable } from '../components/Progress/CoursePerformance'
import { BadgeGrid } from '../components/Progress/BadgeGrid'

const ProgressPage = () => {
  const { data, isLoading, isError } = useProgress()
   useRealtimeProgress()  // Subscribes to real-time updates for progress changes

  const strongestCourse = useMemo(() => {
    if (!data?.courseBreakdown.length) return null
    return [...data.courseBreakdown].sort(
      (a, b) => b.mcqAccuracy - a.mcqAccuracy || b.mcqAttempts - a.mcqAttempts,
    )[0]
  }, [data])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="mr-3 h-6 w-6 animate-spin" /> Loading progress analytics...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-red-400">
        Failed to load progress analytics.
      </div>
    )
  }

  const { summary } = data

  const pendingSessions = Math.max(
    0,
    summary.totalScheduledSessions
    - summary.completedScheduledSessions
    - summary.missedScheduledSessions
    - summary.lessThanScheduledSessions,
  )

  return (
    <div className="space-y-8 p-6" style={{ color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#6B8E23]">
            Progress Center
          </p>
          <h1 className="mt-2 text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Your learning momentum
          </h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
            Schedule completion, quiz performance, flashcard mastery, streaks, and course engagement.
          </p>
        </div>
        <Card className="px-5 py-4 text-right">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Badges earned</p>
          <p className="text-2xl font-bold text-amber-500">
            {summary.badgesEarned}/{summary.totalBadges}
          </p>
        </Card>
      </div>

      <ProgressStats summary={summary} />

      <SessionBreakdown summary={summary} pendingSessions={pendingSessions} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <MonthlyChart data={data.monthly} />
        <div className="space-y-6">
          <CompletionRates summary={summary} />
          <EngagementCard summary={summary} strongestCourse={strongestCourse} />
        </div>
      </div>

      <TrendPanel data={data.dailyActivity} />

      <CoursePerformanceTable courseBreakdown={data.courseBreakdown} />

      <BadgeGrid badges={data.badges} />

    </div>
  )
}

export default ProgressPage