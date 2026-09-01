import { AlertTriangle, Calendar as CalendarIcon, Loader2, Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { useConnectGCal, useCreateEvent, useDeleteCourseData, useDeleteEvent, useDisconnectGCal, useEvents, useGCalStatus, useGenerateAISchedule, usePlanLogs, useSavePlanLogs, useSaveStudyPlan, useStudyPlan, useSyncGCal,} from '../hooks/useScheduler'
import type { CourseEntry, DayStatus, EventType, Priority, StudyStatus } from '../services/scheduler.service'

// Components
import { CourseDetailCard } from '../components/Scheduler/CourseDetailCard'
import { DraftPlanCard } from '../components/Scheduler/DraftPlanCard'
import { StudyPlanGenerator } from '../components/Scheduler/StudyPlanGenerator'
import { UpcomingEvents } from '../components/Scheduler/UpcomingEvents'
import { WeeklyStudyPlan } from '../components/Scheduler/WeeklyStudyPlan'
import { COURSE_COLORS, EVENT_TYPE_OPTIONS, PRIORITY_OPTIONS } from '../components/Scheduler/constants'
import { generateWeeklyPlan, getCurrentWeekStart } from '../components/Scheduler/utils'

// Helpers
const emptyEvent = { title: '', type: 'assignment' as EventType, date: '', time: '', course: '', priority: 'medium' as Priority }

export default function SchedulerPage() {
  const { data: events = [], isLoading: eventsLoading } = useEvents()
  const { data: savedPlan, isLoading: planLoading } = useStudyPlan()
  const { data: existingLogs = [] } = usePlanLogs()
  const { mutate: createEvent, isPending: creating } = useCreateEvent()
  const { mutate: delEvent } = useDeleteEvent()
  const { mutate: savePlan, isPending: savingPlan } = useSaveStudyPlan()
  const { mutate: saveLog, isPending: savingLog } = useSavePlanLogs()
  const { mutate: deleteCourse, isPending: deletingCourse } = useDeleteCourseData()
  const { mutate: generateAI, isPending: generatingAI } = useGenerateAISchedule()

  const { data: gcalStatus, refetch: refetchGCalStatus } = useGCalStatus()
  const { mutate: connectGCal, isPending: connectingGCal } = useConnectGCal()
  const { mutate: syncGCal, isPending: syncingGCal } = useSyncGCal()
  const { mutate: disconnectGCal, isPending: disconnectingGCal } = useDisconnectGCal()

  // Event modal
  const [showEventModal, setShowEventModal] = useState(false)
  const [newEvent, setNewEvent] = useState(emptyEvent)

  // Study plan generator state
  const [pendingCourses, setPendingCourses] = useState<CourseEntry[]>([])
  const [generatedDraft, setGeneratedDraft] = useState<CourseEntry[] | null>(null)

  // Confirmed courses (loaded from DB)
  const [confirmedCourses, setConfirmedCourses] = useState<CourseEntry[]>([])

  // Which confirmed course mini-charts are expanded
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())

  // Day statuses: course → DayStatus[7] (Mon-Sun)
  const [courseStatuses, setCourseStatuses] = useState<Record<string, DayStatus[]>>({})
  const [unsavedCourses, setUnsavedCourses] = useState<Set<string>>(new Set())

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<CourseEntry | null>(null)

  // Regenerate state: course → new weeklyPlan (pending confirmation)
  const [regenPreviews, setRegenPreviews] = useState<Record<string, { dayOfWeek: string; hours: number }[]>>({})

  // CHANGES
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [savedState, setSavedState] = useState<{ courseStatuses: Record<string, DayStatus[]>; confirmedCourses: CourseEntry[] } | null>(null)

  // Load confirmed courses from DB on mount
  useEffect(() => {
    if (planLoading || !savedPlan) return
    const courses = (savedPlan.courses as CourseEntry[]) ?? []
    setConfirmedCourses(courses)
  }, [savedPlan, planLoading])

  // Load existing logs into courseStatuses
  useEffect(() => {
    if (!existingLogs.length) return
    const weekStart = getCurrentWeekStart()
    const map: Record<string, DayStatus[]> = {}
    existingLogs.forEach((log: any) => {
      if (log.weekStart?.startsWith(weekStart)) {
        const key = log.studyPlanCourseId
        if (!map[key]) map[key] = Array(7).fill(null)
        map[key][log.dayOfWeek] = log.status as DayStatus
      }
    })
    setCourseStatuses(map)
  }, [existingLogs])

  useEffect(() => {
    if (confirmedCourses.length > 0 && !savedState) {
      captureSavedState()
    }
  }, [confirmedCourses])

  // Handle Google Calendar OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gcal = params.get('gcal')
    if (!gcal) return

    if (gcal === 'connected') {
      toast.success('Google Calendar connected! Click Sync to import your events.')
      refetchGCalStatus()
    } else if (gcal === 'error') {
      const reason = params.get('reason') ?? 'unknown'
      toast.error(`Google Calendar connection failed: ${reason}`)
    }

    const clean = window.location.pathname
    window.history.replaceState({}, '', clean)
  }, [])

  // Handlers
  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.course || !newEvent.date) return

    // Guard: block exact duplicate (same title + course + date, both have no time)
    const isDuplicate = events.some(ev =>
      ev.title.toLowerCase() === newEvent.title.toLowerCase() &&
      ev.course.toLowerCase() === newEvent.course.toLowerCase() &&
      new Date(ev.date).toDateString() === new Date(newEvent.date).toDateString() &&
      !ev.time &&
      !newEvent.time
    )

    if (isDuplicate) {
      toast.error('An identical event already exists on this date. Add a time to distinguish them.')
      return
    }
    createEvent({ ...newEvent, date: new Date(newEvent.date).toISOString() }, {
      onSuccess: () => { setShowEventModal(false); setNewEvent(emptyEvent) },
    })
  }

  const handleGenerate = () => {
    if (!pendingCourses.length) return

    const newCourses = pendingCourses.map(c => ({
      course: c.course,
      preparation: c.preparation,
      priority: c.priority,
    }))

    const existingCourses = confirmedCourses.map(c => ({
      course: c.course,
      preparation: c.preparation,
      priority: c.priority,
    }))

    generateAI(
      { newCourses, existingCourses, events },
      {
        onSuccess: (schedules) => {
          const draft: CourseEntry[] = pendingCourses.map((c, i) => {
            const colorIndex = (confirmedCourses.length + i) % COURSE_COLORS.length
            const aiResult = schedules.find(s => s.course === c.course)
            return {
              ...c,
              color: c.color || COURSE_COLORS[colorIndex],
              weeklyPlan: aiResult?.weeklyPlan ?? generateWeeklyPlan(c.priority, c.preparation),
            }
          })
          setGeneratedDraft(draft)
        },
      }
    )
  }

  const handleConfirmCourse = (entry: CourseEntry) => {
    const cleanEntry: CourseEntry = {
      course: entry.course,
      preparation: entry.preparation,
      priority: entry.priority,
      color: entry.color,
      weeklyPlan: entry.weeklyPlan,
    }

    let updatedList: CourseEntry[] = []
    setConfirmedCourses(prev => {
      const exists = prev.find(c => c.course === entry.course)
      updatedList = exists
        ? prev.map(c => c.course === entry.course ? cleanEntry : c)
        : [...prev, cleanEntry]
      return updatedList
    })

    setGeneratedDraft(prev => prev?.filter(c => c.course !== entry.course) ?? null)
    setPendingCourses(prev => prev.filter(c => c.course !== entry.course))

    setTimeout(() => savePlan({ courses: updatedList }), 0)
    setExpandedCourses(prev => new Set(prev).add(entry.course))
  }

  const handleCancelDraft = (course: string) => {
    setGeneratedDraft(prev => prev?.filter(c => c.course !== course) ?? null)
    const isConfirmed = confirmedCourses.find(c => c.course === course)
    if (!isConfirmed) {
      const draft = generatedDraft?.find(c => c.course === course)
      if (draft) setPendingCourses(prev => [...prev, { ...draft, weeklyPlan: [] }])
    }
  }

  const handleRegenerateCourse = (course: CourseEntry) => {
    const existingCourses = confirmedCourses
      .filter(c => c.course !== course.course)
      .map(c => ({ course: c.course, preparation: c.preparation, priority: c.priority }))

    generateAI(
      {
        newCourses: [{ course: course.course, preparation: course.preparation, priority: course.priority }],
        existingCourses,
        events,
      },
      {
        onSuccess: (schedules) => {
          const aiResult = schedules[0]
          if (!aiResult) return
          setRegenPreviews(prev => ({ ...prev, [course.course]: aiResult.weeklyPlan }))
        },
      }
    )
  }

  const handleConfirmRegen = (course: CourseEntry) => {
    const newPlan = regenPreviews[course.course]
    if (!newPlan) return

    // 0=Mon … 6=Sun — only replace hours for today and future days
    const todayIndex = (new Date().getDay() + 6) % 7

    const mergedPlan = course.weeklyPlan.map((originalDay, di) => {
      if (di < todayIndex) return originalDay          // past day → keep original hours
      return newPlan[di] ?? originalDay               // today/future → use AI hours
    })

    const updated: CourseEntry[] = confirmedCourses.map(c =>
      c.course === course.course ? { ...c, weeklyPlan: mergedPlan } : c
    )
    setConfirmedCourses(updated)
    const statusKey = course.id ?? course.course
    // Only wipe statuses for future days — past day statuses are already saved
    setCourseStatuses(prev => {
      const current = prev[statusKey] ?? Array(7).fill(null)
      const merged = current.map((s, di) => di < todayIndex ? s : null)
      return { ...prev, [statusKey]: merged }
    })
    setUnsavedCourses(prev => new Set(prev).add(course.course))
    setRegenPreviews(prev => { const n = { ...prev }; delete n[course.course]; return n })
    savePlan({ courses: updated })
    setHasUnsavedChanges(true)
  }

  const handleCancelRegen = (courseName: string) => {
    setRegenPreviews(prev => { const n = { ...prev }; delete n[courseName]; return n })
  }

  const handleUpdatePreparation = (course: CourseEntry, newPrep: number) => {
    const updated = confirmedCourses.map(c =>
      c.course === course.course ? { ...c, preparation: newPrep } : c
    )
    setConfirmedCourses(updated)
    savePlan({ courses: updated })
  }

  const toggleExpand = (course: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev)
      if (next.has(course)) next.delete(course)
      else next.add(course)
      return next
    })
  }

  const handleSetStatus = (course: CourseEntry, dayIndex: number, status: StudyStatus) => {
    const key = course.id ?? course.course
    setCourseStatuses(prev => {
      const current = prev[key] ?? Array(7).fill(null)
      const updated = [...current]
      updated[dayIndex] = updated[dayIndex] === status ? null : status
      return { ...prev, [key]: updated }
    })
    setUnsavedCourses(prev => new Set(prev).add(course.course))
    setHasUnsavedChanges(true)
  }

  const captureSavedState = () => {
    setSavedState({
      courseStatuses: JSON.parse(JSON.stringify(courseStatuses)),
      confirmedCourses: JSON.parse(JSON.stringify(confirmedCourses))
    })
    setHasUnsavedChanges(false)
  }

  const handleCancelChanges = () => {
    if (savedState) {
      setCourseStatuses(savedState.courseStatuses)
      setConfirmedCourses(savedState.courseStatuses ?
        confirmedCourses.map(c => ({
          ...c,
          weeklyPlan: savedState.confirmedCourses.find(sc => sc.course === c.course)?.weeklyPlan || c.weeklyPlan
        })) :
        confirmedCourses
      )
      setUnsavedCourses(new Set())
      setHasUnsavedChanges(false)
    }
  }

  const handleSaveStatus = (course: CourseEntry) => {
    if (!course.id) return

    const statuses = courseStatuses[course.id] ?? Array(7).fill(null)
    const hours = Array(7).fill(0).map((_, i) => course.weeklyPlan[i]?.hours ?? 0)

    saveLog({ studyPlanCourseId: course.id, scheduledHours: hours, dayStatuses: statuses },{
      onSuccess: () => {
        setUnsavedCourses(prev => {
          const n = new Set(prev)
          n.delete(course.course)
          return n
        })

        if (unsavedCourses.size <= 1) captureSavedState()
      },
    })
  }

  const handleDeleteCourse = () => {
    if (!deleteTarget?.id) return
    deleteCourse({ studyPlanCourseId: deleteTarget.id }, {
      onSuccess: () => {
        setConfirmedCourses(prev => prev.filter(c => c.course !== deleteTarget.course))
        setCourseStatuses(prev => { const n = { ...prev }; delete n[deleteTarget.id!]; return n })
        setExpandedCourses(prev => { const n = new Set(prev); n.delete(deleteTarget.course); return n })
        setDeleteTarget(null)
      },
    })
  }

  return (
    <div className="space-y-6 py-12 px-4 sm:px-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Scheduler</h1>
        <p className="text-gray-500">Manage your deadlines and study schedule</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ══ LEFT ══ */}
        <div className="xl:col-span-2 space-y-6">
          {/* Quick actions */}
          <div className="bg-white p-2 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex gap-2 sm:gap-4">
              <Button className='!px-2!sm:px-4' onClick={() => setShowEventModal(true)} icon={<Plus className="w-5 h-5" />} fullWidth>Add Event</Button>
              {gcalStatus?.connected ? (
                <div className="flex gap-2 flex-1">
                  <Button
                    variant="outline"
                    icon={syncingGCal ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarIcon className="w-5 h-5" />}
                    fullWidth
                    onClick={() => syncGCal()}
                    disabled={syncingGCal}
                  >
                    {syncingGCal ? 'Syncing…' : 'Sync Calendar'}
                  </Button>
                  <button
                    onClick={() => disconnectGCal()}
                    disabled={disconnectingGCal}
                    className="px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-xs disabled:opacity-50"
                    title="Disconnect Google Calendar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  icon={connectingGCal ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarIcon className="w-5 h-5" />}
                  fullWidth
                  onClick={() => connectGCal()}
                  disabled={connectingGCal}
                >
                  {connectingGCal ? 'Connecting…' : 'Google Calendar'}
                </Button>
              )}
            </div>
          </div>

          <UpcomingEvents
            events={events}
            eventsLoading={eventsLoading}
            onDeleteEvent={delEvent}
          />

          {confirmedCourses.length > 0 && (
            <WeeklyStudyPlan
              confirmedCourses={confirmedCourses}
              courseStatuses={courseStatuses}
              expandedCourses={expandedCourses}
              onToggleExpand={toggleExpand}
            />
          )}

          <AnimatePresence>
            {confirmedCourses.filter(c => expandedCourses.has(c.course)).map((plan, pi) => (
              <motion.div key={plan.course} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ delay: pi * 0.05 }}>
                <CourseDetailCard
                  plan={plan}
                  courseStatuses={courseStatuses}
                  unsavedCourses={unsavedCourses}
                  regenPreview={regenPreviews[plan.course]}
                  generatingAI={generatingAI}
                  savingLog={savingLog}
                  hasUnsavedChanges={hasUnsavedChanges}
                  onSetStatus={handleSetStatus}
                  onSaveStatus={handleSaveStatus}
                  onCancelChanges={handleCancelChanges}
                  onRegenerate={handleRegenerateCourse}
                  onConfirmRegen={handleConfirmRegen}
                  onCancelRegen={handleCancelRegen}
                  onSetDeleteTarget={setDeleteTarget}
                  onUpdatePreparation={handleUpdatePreparation}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {generatedDraft && generatedDraft.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">Newly Generated — Confirm to save</p>
              <AnimatePresence>
                {generatedDraft.map((plan, pi) => (
                  <motion.div key={plan.course} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }} transition={{ delay: pi * 0.08 }}>
                    <DraftPlanCard
                      plan={plan}
                      pi={pi}
                      savingPlan={savingPlan}
                      onCancelDraft={handleCancelDraft}
                      onConfirmCourse={handleConfirmCourse}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ══ RIGHT: Generator ══ */}
        <div className="space-y-6">
          <StudyPlanGenerator
            confirmedCourses={confirmedCourses}
            pendingCourses={pendingCourses}
            setPendingCourses={setPendingCourses}
            generatingAI={generatingAI}
            onGenerate={handleGenerate}
          />
        </div>
      </div>

      {/* ══ Add Event Modal ══ */}
      <Modal isOpen={showEventModal} onClose={() => { setShowEventModal(false); setNewEvent(emptyEvent) }} title="Add New Event">
        <div className="space-y-4">
          <Input label="Event Title" placeholder="e.g., Assignment 3" value={newEvent.title}
            onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required />
          <Input label="Course" placeholder="e.g., Data Structures" value={newEvent.course}
            onChange={e => setNewEvent({ ...newEvent, course: e.target.value })} required />
          <div>
            <label className="block text-sm mb-2 text-gray-700">Event Type</label>
            <select value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value as EventType })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#667eea]">
              {EVENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* The date input's min is set to today to prevent selecting past dates */}
            <Input label="Date" type="date" value={newEvent.date} min={new Date().toISOString().split('T')[0]} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} required />
            <Input label="Time (optional)" type="time" value={newEvent.time} onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-2 text-gray-700">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button key={p} type="button" onClick={() => setNewEvent({ ...newEvent, priority: p })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${newEvent.priority === p ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowEventModal(false); setNewEvent(emptyEvent) }} fullWidth>Cancel</Button>
            <Button onClick={handleAddEvent} fullWidth disabled={creating}>{creating ? 'Adding...' : 'Add Event'}</Button>
          </div>
        </div>
      </Modal>

      {/* ══ Delete Confirmation Modal ══ */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Course" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 mb-1">This action cannot be undone</p>
              <p className="text-sm text-red-600">
                Deleting <strong>{deleteTarget?.course}</strong> will remove it from your weekly plan
                and <strong>erase all its progress logs</strong> from the Progress page calculations.
                Think carefully before deleting.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} fullWidth>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteCourse} fullWidth disabled={deletingCourse}>
              {deletingCourse ? 'Deleting…' : 'Delete Course'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}