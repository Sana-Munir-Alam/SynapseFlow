import React from 'react'
import { CheckCircle2, XCircle, TrendingDown, TrendingUp } from 'lucide-react'
import type { StudyStatus, EventType, Priority } from '../../services/scheduler.service'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const COURSE_COLORS = [
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
  '#0ea5e9', // sky
  '#d946ef', // fuchsia
  '#84cc16', // lime
  '#fb7185', // rose
]

export const STATUS_CONFIG: Record<StudyStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  complete: { label: 'Complete', color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  missed: { label: 'Missed', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: <XCircle className="w-3.5 h-3.5" /> },
  less_than: { label: 'Less Than', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: <TrendingDown className="w-3.5 h-3.5" /> },
  greater_than: { label: 'Greater Than', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd', icon: <TrendingUp className="w-3.5 h-3.5" /> },
}

export const STATUS_OPTIONS = Object.entries(STATUS_CONFIG) as [StudyStatus, typeof STATUS_CONFIG[StudyStatus]][]

export const EVENT_TYPE_OPTIONS: EventType[] = ['assignment', 'quiz', 'mid', 'final', 'project', 'study', 'general']
export const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high']

export const eventTypeColors: Record<EventType, string> = {
  assignment: 'bg-blue-100 text-blue-700 border-blue-200',
  quiz: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  mid: 'bg-red-100 text-red-700 border-red-200',
  final: 'bg-purple-100 text-purple-700 border-purple-200',
  project: 'bg-green-100 text-green-700 border-green-200',
  study: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  general: 'bg-gray-100 text-gray-700 border-gray-200',
}

export const priorityBarColors: Record<Priority, string> = {
  high: 'bg-red-500', 
  medium: 'bg-yellow-500', 
  low: 'bg-green-500',
}
