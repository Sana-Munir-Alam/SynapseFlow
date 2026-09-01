import { Check, Clock, Loader2, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { motion } from 'motion/react'
import type { CourseEntry, DayStatus, StudyStatus } from '../../services/scheduler.service'
import { Card } from '../Card'
import { STATUS_CONFIG, STATUS_OPTIONS } from './constants'
import React from 'react'

interface CourseDetailCardProps {
  plan: CourseEntry
  courseStatuses: Record<string, DayStatus[]>
  unsavedCourses: Set<string>
  regenPreview: { dayOfWeek: string; hours: number }[] | undefined
  generatingAI: boolean
  savingLog: boolean
  hasUnsavedChanges: boolean
  onSetStatus: (course: CourseEntry, dayIndex: number, status: StudyStatus) => void
  onSaveStatus: (course: CourseEntry) => void
  onCancelChanges: () => void
  onRegenerate: (course: CourseEntry) => void
  onConfirmRegen: (course: CourseEntry) => void
  onCancelRegen: (courseName: string) => void
  onSetDeleteTarget: (course: CourseEntry) => void
  onUpdatePreparation: (course: CourseEntry, newPrep: number) => void
}

export function CourseDetailCard({
  plan,
  courseStatuses,
  unsavedCourses,
  regenPreview,
  generatingAI,
  savingLog,
  hasUnsavedChanges,
  onSetStatus,
  onSaveStatus,
  onCancelChanges,
  onRegenerate,
  onConfirmRegen,
  onCancelRegen,
  onSetDeleteTarget,
  onUpdatePreparation,
}: CourseDetailCardProps) {
  const hasUnsaved = unsavedCourses.has(plan.course)
  const statuses = courseStatuses[plan.id ?? plan.course] ?? Array(7).fill(null)

  const [localPrep, setLocalPrep] = React.useState(plan.preparation)
  const [prepDirty, setPrepDirty] = React.useState(false)
  React.useEffect(() => { setLocalPrep(plan.preparation); setPrepDirty(false) }, [plan.preparation])
  
  const todayIndex = (new Date().getDay() + 6) % 7  // 0=Mon … 6=Sun
  const displayPlan = regenPreview
    ? plan.weeklyPlan.map((originalDay, i) => {
        if (i < todayIndex) return { ...originalDay, isPast: true, isLocked: true }
        return { dayOfWeek: originalDay.dayOfWeek, hours: regenPreview[i]?.hours ?? 0, isPast: false, isLocked: false }
      })
    : plan.weeklyPlan.map((d, i) => ({ ...d, isPast: i < todayIndex, isLocked: false }))

  return (
    <Card>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: plan.color }} />
        <h3 className="text-base font-semibold text-gray-900 flex-1">{plan.course}</h3>
        {regenPreview ? (
          <>
            <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded-full border border-amber-200">
              New schedule preview
            </span>
            <button onClick={() => onConfirmRegen(plan)}
              className="cursor-pointer flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 transition-colors">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => onCancelRegen(plan.course)}
              className="cursor-pointer flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-red-600 hover:bg-gray-50 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium flex items-center gap-1 border border-green-200">
              <Check className="w-3 h-3" /> Confirmed
            </span>
            <button onClick={() => onRegenerate(plan)}
              disabled={generatingAI}
              className="cursor-pointer flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </button>
            <button onClick={() => onSetDeleteTarget(plan)}
              className="cursor-pointer flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      <div className="space-y-2">
        {displayPlan.map((dayPlan, di) => {
          const status = regenPreview ? null : statuses[di]
          const statusCfg = status ? STATUS_CONFIG[status] : null
          const barCol = statusCfg ? statusCfg.color : plan.color
          
          const todayIndex = (new Date().getDay() + 6) % 7  // 0=Mon…6=Sun
          const isPastOrToday = di <= todayIndex

          const isPastLocked = regenPreview && (dayPlan as any).isLocked

          return (
            <div key={di} className="group/dayrow flex items-center gap-3">
              <span className="text-sm text-gray-500 w-10 flex-shrink-0">{dayPlan.dayOfWeek}</span>

              <div className={`ml-8 flex-1 h-8 rounded-lg overflow-hidden ${isPastLocked ? 'bg-gray-50' : 'bg-gray-100'}`}>
                <motion.div initial={{ width: 0 }}
                  animate={{ width: `${Math.min((dayPlan.hours / 4) * 100, 100)}%` }}
                  className="h-full flex items-center justify-end px-2 rounded-lg"
                  style={{ backgroundColor: isPastLocked ? '#d1d5db' : barCol, opacity: isPastLocked ? 0.6 : 1 }}>
                  <span className="text-xs font-semibold text-white">{dayPlan.hours}h</span>
                </motion.div>
              </div>

              {/* Lock badge for past days during regen preview */}
              {isPastLocked && (
                <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1 ml-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  kept
                </span>
              )}

              {!regenPreview && isPastOrToday && (
                <div className="flex items-center gap-1 opacity-0 group-hover/dayrow:opacity-100 transition-opacity flex-shrink-0">
                  {STATUS_OPTIONS.map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => onSetStatus(plan, di, key)}
                      title={cfg.label}
                      className="cursor-pointer p-1 rounded-md transition-all hover:scale-110"
                      style={{
                        backgroundColor: status === key ? cfg.bg : 'transparent',
                        color: cfg.color,
                        border: `1px solid ${status === key ? cfg.color : 'transparent'}`,
                      }}
                    >
                      {cfg.icon}
                    </button>
                  ))}
                </div>
              )}

              {statusCfg && !regenPreview && isPastOrToday&& (
                <span className="text-xs font-medium flex-shrink-0" style={{ color: statusCfg.color, minWidth: '72px', textAlign: 'right' }}>
                  {statusCfg.label}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {!regenPreview && (
        <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">

          {/* Preparation slider row */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-24 flex-shrink-0">Preparation</span>
            <input type="range" min={0} max={100} step={5} value={localPrep}
              onChange={e => {
                setLocalPrep(Number(e.target.value))
                setPrepDirty(Number(e.target.value) !== plan.preparation)
              }}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[#6B8E23]"
              style={{
                background: `linear-gradient(to right, #6B8E23 ${localPrep}%, #e5e7eb ${localPrep}%)`
              }}
            />
            <span
              className="text-xs font-semibold w-9 text-right flex-shrink-0"
              style={{ color: localPrep >= 70 ? '#16a34a' : localPrep >= 40 ? '#d97706' : '#dc2626' }}
            >
              {localPrep}%
            </span>
            {prepDirty && (
              <button
                onClick={() => {
                  onUpdatePreparation(plan, localPrep)
                  setPrepDirty(false)
                }}
                className="cursor-pointer flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[#6B8E23] text-white hover:bg-[#556B2F] transition-colors flex-shrink-0"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            )}
          </div>

          {/* Hours + action buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">{plan.weeklyPlan.reduce((s, d) => s + d.hours, 0).toFixed(1)}h / week</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSaveStatus(plan)}
                disabled={!hasUnsaved || savingLog}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: hasUnsaved ? 'linear-gradient(to right, #6B8E23, #556B2F)' : 'transparent',
                  color: hasUnsaved ? '#fff' : '#d1d5db',
                  border: hasUnsaved ? 'none' : '1px solid #e5e7eb',
                  cursor: hasUnsaved ? 'pointer' : 'not-allowed',
                }}>
                <Save className="w-3.5 h-3.5" />
                {savingLog ? 'Saving…' : 'Save Progress'}
              </button>

              <button
                onClick={onCancelChanges}
                disabled={!hasUnsavedChanges}
                className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${hasUnsavedChanges
                  ? 'bg-white border border-red-300 text-red-600 hover:bg-red-50'
                  : 'bg-transparent border border-gray-200 text-gray-300 cursor-not-allowed'
                  }`}>
                Cancel
              </button>
            </div>
          </div>

        </div>
      )}
    </Card>
  )
}
