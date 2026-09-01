import { BarChart3, Flame, TrendingUp } from 'lucide-react'
import type { MonthlyProgressPoint } from '../../services/progress.service'
import { Card, formatMonth } from './Common'

interface MonthlyChartProps {
  data: MonthlyProgressPoint[]
}

export const MonthlyChart = ({ data }: MonthlyChartProps) => {
  const maxScheduled = Math.max(1, ...data.map((d) => d.scheduled))

  return (
    <Card className="p-6 overflow-x-scroll">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Monthly Schedule Completion
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Sessions completed or exceeded vs. total scheduled per month.
          </p>
        </div>
        <BarChart3 className="h-6 w-6 flex-shrink-0" style={{ color: '#6B8E23' }} />
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-faint)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#6B8E23]" /> Completed / Over-time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/60" /> Missed
        </span>
      </div>

      <div className="flex h-56 items-end gap-3 overflow-x-auto pb-2">
        {data.map((item) => {
          const completedH = maxScheduled > 0 ? Math.round((item.completed / maxScheduled) * 100) : 0
          const missedH    = maxScheduled > 0 ? Math.round((item.missed    / maxScheduled) * 100) : 0
          return (
            <div key={item.month} className="flex min-w-16 flex-1 flex-col items-center gap-2">
              <div className="flex h-40 w-full flex-col-reverse items-stretch overflow-hidden rounded-xl"
                   style={{ background: 'var(--bg-subtle)' }}>
                <div
                  className="w-full rounded-t-none bg-gradient-to-t from-[#556B2F] to-[#6B8E23] transition-all"
                  style={{ height: `${completedH}%`, minHeight: completedH > 0 ? 4 : 0 }}
                  title={`${item.completed} completed`}
                />
                <div
                  className="w-full bg-red-400/50 transition-all"
                  style={{ height: `${missedH}%`, minHeight: missedH > 0 ? 4 : 0 }}
                  title={`${item.missed} missed`}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {formatMonth(item.month)}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {item.completionRate}%
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

interface TrendPanelProps {
  data: { date: string; activityCount: number }[]
}

export const TrendPanel = ({ data }: TrendPanelProps) => {
  const max = Math.max(1, ...data.map((d) => d.activityCount))
  const hasAnyActivity = data.some((d) => d.activityCount > 0)

  return (
    <Card className="p-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            30-Day Activity Trend
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            All study activity: schedule logs, MCQ attempts, and flashcard reviews.
          </p>
        </div>
        <TrendingUp className="h-6 w-6 flex-shrink-0 text-emerald-500" />
      </div>

      <p className="mb-5 rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--bg-subtle)', color: 'var(--text-faint)' }}>
        Note: this trend counts every type of activity. Your streak only counts days where every scheduled session was completed or exceeded.
      </p>

      {!hasAnyActivity ? (
        <div className="flex h-28 items-center justify-center rounded-xl text-sm"
             style={{ background: 'var(--bg-subtle)', color: 'var(--text-faint)' }}>
          No activity in the last 30 days yet.
        </div>
      ) : (
        <div className="relative flex h-28 items-end gap-0.5">
          {data.map((item) => {
            const pct = item.activityCount > 0
              ? Math.max(0, (item.activityCount / max) * 100)
              : 0
            return (
              <div key={item.date} className="flex flex-1 flex-col items-stretch justify-end" style={{ height: '100%' }}>
                {item.activityCount > 0 ? (
                  <div
                    className="w-full rounded-t bg-emerald-500 transition-all"
                    style={{ height: `${pct}%`, minHeight: '6px' }}
                    title={`${item.date}: ${item.activityCount} activities`}
                  />
                ) : (
                  <div
                    className="w-full rounded-t"
                    style={{ height: '2px', background: 'var(--bg-muted)' }}
                    title={`${item.date}: no activity`}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-2 flex justify-between text-xs" style={{ color: 'var(--text-faint)' }}>
          <span>{data[0]?.date.slice(5)}</span>
          <span>{data[Math.floor(data.length / 2)]?.date.slice(5)}</span>
          <span>{data[data.length - 1]?.date.slice(5)}</span>
        </div>
      )}
    </Card>
  )
}

interface SessionBreakdownProps {
  summary: any
  pendingSessions: number
}

export const SessionBreakdown = ({ summary, pendingSessions }: SessionBreakdownProps) => (
  <Card className="p-6">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Session Breakdown
      </h2>
      <span className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        Total: <strong style={{ color: 'var(--text-primary)' }}>{summary.totalScheduledSessions}</strong> sessions
      </span>
    </div>

    {summary.totalScheduledSessions > 0 && (
      <>
        <div className="flex h-4 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-muted)' }}>
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(summary.completedScheduledSessions / summary.totalScheduledSessions) * 100}%` }}
            title="Completed / Over-time"
          />
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${(summary.lessThanScheduledSessions / summary.totalScheduledSessions) * 100}%` }}
            title="Less than scheduled"
          />
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${(summary.missedScheduledSessions / summary.totalScheduledSessions) * 100}%` }}
            title="Missed"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Completed / Over-time', count: summary.completedScheduledSessions, dot: 'bg-emerald-500' },
            { label: 'Less than scheduled',  count: summary.lessThanScheduledSessions,   dot: 'bg-amber-400' },
            { label: 'Missed',               count: summary.missedScheduledSessions,     dot: 'bg-red-500' },
            { label: 'Pending',              count: pendingSessions,                      dot: 'bg-[#A9BA9D]' },
          ].map(({ label, count, dot }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dot}`} />
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{count}</p>
            </div>
          ))}
        </div>
      </>
    )}

    <div className="mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
         style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
      <Flame className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
      <span>
        <strong style={{ color: 'var(--text-secondary)' }}>Streak rule: </strong>
        a calendar day counts only when <em>every</em> session scheduled for that day is{' '}
        <span className="font-semibold text-emerald-500">Complete</span> or{' '}
        <span className="font-semibold text-emerald-500">Over-time</span>.
      </span>
    </div>
  </Card>
)
