import { BookOpen, Brain, Calendar, CheckCircle2, ChevronRight, Flame, MessageSquare, TrendingUp, Trophy, User, Users,} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useProgress } from '../hooks/useProgress'
import { useEvents } from '../hooks/useScheduler'
import { useMyGroups } from '../hooks/useGroup'

function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  assignment: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  quiz:       'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  mid:        'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  final:      'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  project:    'bg-green-100 text-[#6B8E23] dark:bg-[#6B8E23]/15 dark:text-[#A9BA9D]',
  study:      'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  general:    'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
}

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-red-500',
  medium: 'bg-amber-400',
  low:    'bg-emerald-500',
}

// Group avatar colour — deterministic from group name
const GROUP_COLORS = [
  '#6B8E23', '#556B2F', '#A9BA9D', '#f97316',
  '#10b981', '#0ea5e9', '#f59e0b', '#14b8a6',
]
function groupColor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length]
}


function StatCard({
  icon,
  label,
  value,
  sub,
  accent = '#6B8E23',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-3 shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}20`, color: accent }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
          {value}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        {sub && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  )
}

function QuickLink({
  icon,
  label,
  to,
  accent,
}: {
  icon: React.ReactNode
  label: string
  to: string
  accent: string
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="cursor-pointer flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors group w-full shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
        style={{ background: `${accent}20`, color: accent }}
      >
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
    </button>
  )
}

interface TopGroup {
  id: string
  name: string
  role: 'admin' | 'member'
}

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: userData }     = useCurrentUser()
  const { data: progress }     = useProgress()
  const { data: events = [] }  = useEvents()
  const { data: groups = [] }  = useMyGroups()

  const user        = userData?.user
  const summary     = progress?.summary
  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || 'there'
    : 'there'

  // Upcoming events — next 5, sorted by date ascending
  const upcomingEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return [...events]
      .filter((e) => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
  }, [events])

  // Top 5 groups
  const topGroups = useMemo(() => groups.slice(0, 5), [groups])

  return (
    <div className="min-h-full w-full px-5 py-6 md:px-8 md:py-8 max-w-6xl mx-auto space-y-8">

      {/* ── Hero greeting ── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#6B8E23]/15 flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-[#6B8E23]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
            {greet()}, {displayName} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Here's what's happening with your studies today.
          </p>
        </div>
      </div>

      {/* ── Stat grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Day streak"
          value={summary?.currentStreak ?? 0}
          sub={(summary?.currentStreak ?? 0) > 0 ? 'Keep it going 🔥' : 'Start today'}
          accent="#f97316"
        />
        <StatCard
          icon={<Brain className="w-5 h-5" />}
          label="MCQ accuracy"
          value={`${Math.round(summary?.mcqAccuracy ?? 0)}%`}
          sub={`${summary?.mcqAttempts ?? 0} attempts`}
          accent="#6B8E23"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Schedule done"
          value={`${Math.round(summary?.scheduleCompletionRate ?? 0)}%`}
          sub={`${summary?.completedScheduledSessions ?? 0} / ${summary?.totalScheduledSessions ?? 0} sessions`}
          accent="#10b981"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Badges"
          value={`${summary?.badgesEarned ?? 0} / ${summary?.totalBadges ?? 0}`}
          sub="Achievements earned"
          accent="#f59e0b"
        />
      </div>

      {/* ── Middle row: My Groups + Upcoming Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* My Groups */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">My Groups</h2>
            <button
              onClick={() => navigate('/dashboard/group-chat')}
              className="cursor-pointer text-xs text-[#6B8E23] hover:text-[#556B2F] dark:hover:text-[#A9BA9D] flex items-center gap-0.5 transition-colors font-medium"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {topGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-500">No groups yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">Join or create a group in Group Chat</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {topGroups.map((group: TopGroup) => {
                const color = groupColor(group.name)
                const initials = group.name
                  .split(' ')
                  .map((w: string) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                return (
                  <li
                    key={group.id}
                    onClick={() => navigate('/dashboard/group-chat')}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 cursor-pointer transition-colors"
                  >
                    <div
                      className="size-9 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold"
                      style={{ background: color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {group.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {group.role === 'admin' ? 'Admin' : 'Member'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Events</h2>
            <button
              onClick={() => navigate('/dashboard/scheduler')}
              className="cursor-pointer text-xs text-[#6B8E23] hover:text-[#556B2F] dark:hover:text-[#A9BA9D] flex items-center gap-0.5 transition-colors font-medium"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-500">No upcoming events</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">Add events in the Scheduler</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {upcomingEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5"
                >
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 capitalize ${
                      EVENT_TYPE_COLORS[event.type] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400'
                    }`}
                  >
                    {event.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {event.title}
                    </p>
                    {event.course && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{event.course}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`w-2 h-2 rounded-full ${PRIORITY_DOT[event.priority] ?? 'bg-gray-400'}`}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDate(event.date)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Access</h2>
        <div className="grid grid-cols-4 gap-3">
          <QuickLink icon={<MessageSquare className="w-5 h-5" />} label="Group Chat" to="/dashboard/group-chat" accent="#6B8E23" />
          <QuickLink icon={<BookOpen className="w-5 h-5" />}      label="Notes"      to="/dashboard/notes"      accent="#556B2F" />
          <QuickLink icon={<Calendar className="w-5 h-5" />}      label="Scheduler"  to="/dashboard/scheduler"  accent="#0ea5e9" />
          <QuickLink icon={<TrendingUp className="w-5 h-5" />}    label="Progress"   to="/dashboard/progress"   accent="#10b981" />
        </div>
      </div>

    </div>
  )
}