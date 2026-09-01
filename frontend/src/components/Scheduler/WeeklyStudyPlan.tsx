import React from 'react'
import { motion } from 'motion/react'
import { Card } from '../Card'
import { DAYS, STATUS_OPTIONS, STATUS_CONFIG } from './constants'
import type { CourseEntry, DayStatus } from '../../services/scheduler.service'

interface WeeklyStudyPlanProps {
  confirmedCourses: CourseEntry[]
  courseStatuses: Record<string, DayStatus[]>
  expandedCourses: Set<string>
  onToggleExpand: (courseName: string) => void
}

export function WeeklyStudyPlan({
  confirmedCourses,
  courseStatuses,
  expandedCourses,
  onToggleExpand
}: WeeklyStudyPlanProps) {
  const maxHoursInChart = React.useMemo(() => {
    if (!confirmedCourses.length) return 1
    return Math.max(1, ...DAYS.map((_day, di) =>
      confirmedCourses.reduce((sum, c) => sum + (c.weeklyPlan[di]?.hours ?? 0), 0)
    ))
  }, [confirmedCourses])

  const getChartBarColor = (course: CourseEntry, dayIndex: number): string => {
    const key = course.id ?? course.course
    const status = courseStatuses[key]?.[dayIndex]
    if (status) return STATUS_CONFIG[status].color
    return course.color
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Weekly Study Plan</h3>
          <p className="text-sm text-gray-400 mt-0.5">Click a course box below to expand its detail chart</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-end max-w-xs">
          {confirmedCourses.map(c => (
            <div key={c.course} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-xs text-gray-600 whitespace-nowrap">{c.course}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {DAYS.map((day, di) => {
          const dayEntries = confirmedCourses.map(c => ({
            course: c.course,
            color: getChartBarColor(c, di),
            hours: c.weeklyPlan[di]?.hours ?? 0,
            status: courseStatuses[c.id ?? c.course]?.[di],
          })).filter(e => e.hours > 0)

          const totalHours = dayEntries.reduce((s, e) => s + e.hours, 0)
          const barWidthPct = (totalHours / maxHoursInChart) * 100

          return (
            <div key={day} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-10 flex-shrink-0">{day}</span>
              <div className="flex-1 h-9 bg-gray-100 rounded-lg overflow-visible relative">
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${barWidthPct}%` }}
                    transition={{ delay: di * 0.07, duration: 0.5, ease: 'easeOut' }}
                    className="h-full flex">
                    {dayEntries.map(entry => {
                      const segPct = totalHours > 0 ? (entry.hours / totalHours) * 100 : 0
                      return (
                        <div key={entry.course}
                          style={{ width: `${segPct}%`, backgroundColor: entry.color }}
                          className="h-full relative group/seg">
                        </div>
                      )
                    })}
                  </motion.div>
                </div>
                <div className="absolute inset-0 flex pointer-events-none" style={{ width: `${barWidthPct}%` }}>
                  {dayEntries.map(entry => {
                    const segPct = totalHours > 0 ? (entry.hours / totalHours) * 100 : 0
                    return (
                      <div key={entry.course} style={{ width: `${segPct}%` }}
                        className="h-full relative group/seg pointer-events-auto">
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/seg:block z-20 pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                            {entry.course}: {entry.hours}h{entry.status ? ` · ${STATUS_CONFIG[entry.status].label}` : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 pointer-events-none z-10">
                  {totalHours.toFixed(1)}h
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
        {STATUS_OPTIONS.map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            {cfg.label}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {confirmedCourses.map(c => {
          const total = c.weeklyPlan.reduce((s, d) => s + d.hours, 0)
          return (
            <div key={c.course} className="p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm"
              style={{ borderColor: c.color + '50', backgroundColor: c.color + '0e' }}
              onClick={() => onToggleExpand(c.course)}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-xs font-semibold text-gray-700 truncate">{c.course}</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{total.toFixed(1)}h</p>
              <p className="text-xs text-gray-400">this week · {expandedCourses.has(c.course) ? 'click to hide' : 'click to expand'}</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
