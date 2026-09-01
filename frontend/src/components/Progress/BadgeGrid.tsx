import { Award, Trophy } from 'lucide-react'
import type { ProgressBadge } from '../../services/progress.service'
import { ProgressBar, clamp, iconMap } from './Common'

const BadgeCard = ({ badge }: { badge: ProgressBadge }) => {
  const progress = badge.targetValue > 0
    ? Math.round((badge.progressValue / badge.targetValue) * 100)
    : 0

  return (
    <div
      className="rounded-2xl border p-5 transition"
      style={
        badge.earned
          ? { borderColor: 'rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.08)' }
          : { borderColor: 'var(--border)', background: 'var(--bg-subtle)' }
      }
    >
      <div className="flex items-start gap-4">
        <div
          className="rounded-2xl p-3"
          style={
            badge.earned
              ? { background: '#fbbf24', color: '#1c1917' }
              : { background: 'var(--bg-muted)', color: 'var(--text-muted)' }
          }
        >
          {iconMap[badge.icon] ?? <Award className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{badge.title}</h3>
            {badge.earned && (
              <span className="rounded-full bg-amber-400 px-2 py-1 text-xs font-bold text-stone-900">
                Earned
              </span>
            )}
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{badge.description}</p>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs" style={{ color: 'var(--text-faint)' }}>
              <span>{Math.min(badge.progressValue, badge.targetValue)} / {badge.targetValue}</span>
              <span>{clamp(progress)}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface BadgeGridProps {
  badges: ProgressBadge[]
}

export const BadgeGrid = ({ badges }: BadgeGridProps) => (
  <div>
    <div className="mb-5 flex items-center gap-3">
      <Trophy className="h-7 w-7 text-amber-500" />
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Badges & Achievements
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Persisted achievements synced from your study activity.
        </p>
      </div>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {badges.map((badge) => <BadgeCard key={badge.id} badge={badge} />)}
    </div>
  </div>
)
