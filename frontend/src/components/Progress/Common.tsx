import React from 'react'
import { CalendarCheck, CheckCircle2, Target, Brain, Layers, Repeat, Flame, FileStack, BookOpen, Trophy } from 'lucide-react'

export const formatMonth = (value: string) => {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short' })
}

export const clamp = (value: number) => Math.min(100, Math.max(0, value || 0))

export const iconMap: Record<string, React.ReactNode> = {
  'calendar-check':  <CalendarCheck className="h-5 w-5" />,
  'check-circle':    <CheckCircle2 className="h-5 w-5" />,
  target:            <Target className="h-5 w-5" />,
  brain:             <Brain className="h-5 w-5" />,
  layers:            <Layers className="h-5 w-5" />,
  repeat:            <Repeat className="h-5 w-5" />,
  flame:             <Flame className="h-5 w-5" />,
  'flame-kindling':  <Flame className="h-5 w-5" />,
  'file-stack':      <FileStack className="h-5 w-5" />,
  books:             <BookOpen className="h-5 w-5" />,
  trophy:            <Trophy className="h-5 w-5" />,
}

export const Card = ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
  <div
    className={`rounded-2xl border shadow-sm ${className}`}
    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
  >
    {children}
  </div>
)

export const StatCard = ({ title, value, subtitle, icon, }: {
  title: string; value: string | number; subtitle: string; icon: React.ReactNode
}) => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{title}</p>
        <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
      <div className="rounded-2xl p-3" style={{ background: 'rgba(107,142,35,0.12)', color: '#6B8E23' }}>
        {icon}
      </div>
    </div>
    <p className="mt-3 text-sm" style={{ color: 'var(--text-faint)' }}>{subtitle}</p>
  </Card>
)

export const ProgressBar = ({ value, color = 'bg-[#6B8E23]' }: { value: number; color?: string }) => (
  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-muted)' }}>
    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${clamp(value)}%` }} />
  </div>
)
