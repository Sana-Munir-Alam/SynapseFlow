import React from 'react'
import { Calendar as CalendarIcon, Search, SlidersHorizontal, X, ChevronDown, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Card } from '../Card'
import { EVENT_TYPE_OPTIONS, PRIORITY_OPTIONS, eventTypeColors, priorityBarColors } from './constants'
import type { EventType, Priority, Event } from '../../services/scheduler.service'

interface UpcomingEventsProps {
  events: Event[]
  eventsLoading: boolean
  onDeleteEvent: (id: string) => void
}

export function UpcomingEvents({ events, eventsLoading, onDeleteEvent }: UpcomingEventsProps) {
  const [filterType, setFilterType] = React.useState<EventType | 'all'>('all')
  const [filterPriority, setFilterPriority] = React.useState<Priority | 'all'>('all')
  const [filterCourse, setFilterCourse] = React.useState('')
  const [showFilters, setShowFilters] = React.useState(false)
  const [showPast, setShowPast] = React.useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filteredEvents = React.useMemo(() => {
    return events.filter(ev => {
      const evDate = new Date(ev.date)
      if (!showPast && evDate < today) return false           // ← NEW: hide past unless toggled
      if (filterType !== 'all' && ev.type !== filterType) return false
      if (filterPriority !== 'all' && ev.priority !== filterPriority) return false
      if (filterCourse && !ev.course.toLowerCase().includes(filterCourse.toLowerCase())) return false
      return true
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [events, filterType, filterPriority, filterCourse, showPast])

  const pastCount = React.useMemo(() => events.filter(ev => new Date(ev.date) < today).length , [events])

  const hasActiveFilters = filterType !== 'all' || filterPriority !== 'all' || filterCourse !== ''
  

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Upcoming Events</h3>
        <div className="flex items-center gap-3">
          {pastCount > 0 && (
            <button
              onClick={() => setShowPast(v => !v)}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${showPast ? 'bg-gray-200 text-gray-700 border-gray-300' : 'text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'}`}
            >
              {showPast ? `Hide past (${pastCount})` : `Show past (${pastCount})`}
            </button>
          )}
          <button onClick={() => setShowFilters(v => !v)}
            className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${hasActiveFilters ? 'bg-[#6B8E23]/10 text-[#6B8E23]' : 'text-gray-600 hover:bg-gray-100'}`}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-5 h-5 bg-[#6B8E23] text-white rounded-full text-xs flex items-center justify-center">
                {[filterType !== 'all', filterPriority !== 'all', filterCourse !== ''].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mb-4 p-4 bg-gray-50 rounded-xl space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Filter by course name..." value={filterCourse}
                  onChange={e => setFilterCourse(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8E23]" />
                {filterCourse && <button onClick={() => setFilterCourse('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-36">
                  <p className="text-xs font-medium text-gray-600 mb-1">Type</p>
                  <div className="flex flex-wrap gap-1">
                    {(['all', ...EVENT_TYPE_OPTIONS] as const).map(t => (
                      <button key={t} onClick={() => setFilterType(t as any)}
                        className={`cursor-pointer px-2 py-1 rounded-md text-xs font-medium capitalize transition-colors ${filterType === t ? 'bg-[#6B8E23] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {t === 'all' ? 'All' : t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-36">
                  <p className="text-xs font-medium text-gray-600 mb-1">Priority</p>
                  <div className="flex gap-1">
                    {(['all', ...PRIORITY_OPTIONS] as const).map(p => (
                      <button key={p} onClick={() => setFilterPriority(p as any)}
                        className={`cursor-pointer px-2 py-1 rounded-md text-xs font-medium capitalize transition-colors ${filterPriority === p ? 'bg-[#6B8E23] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {p === 'all' ? 'All' : p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {hasActiveFilters && (
                <button onClick={() => { setFilterType('all'); setFilterPriority('all'); setFilterCourse('') }}
                  className="cursor-pointer text-xs text-red-500 hover:text-red-700 font-medium">Clear all filters</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {eventsLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No events found</p>
          <p className="text-sm mt-1">{hasActiveFilters ? 'Try adjusting your filters' : !showPast && pastCount > 0 ? `${pastCount} past event${pastCount > 1 ? 's' : ''} hidden — click "Show past" above` : 'Add your first event above'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredEvents.map((ev, i) => (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.03 }}
                className="group flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className={`px-3 py-1 rounded-lg text-xs font-semibold border flex-shrink-0 ${eventTypeColors[ev.type]}`}>
                  {ev.type.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{ev.title}</h4>
                  <p className="text-sm text-gray-600">{ev.course}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  {ev.time && <p className="text-xs text-gray-500">{ev.time}</p>}
                </div>
                <div className={`w-2 h-12 rounded-full flex-shrink-0 ${priorityBarColors[ev.priority]}`} />
                <button onClick={() => onDeleteEvent(ev.id)}
                  className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-100 text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Card>
  )
}