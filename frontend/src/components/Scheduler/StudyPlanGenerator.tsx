import { Check, Loader2, Plus, Sparkles, X, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import React from 'react'
import type { CourseEntry, Priority } from '../../services/scheduler.service'
import { Button } from '../Button'
import { Card } from '../Card'
import { Input } from '../Input'
import { COURSE_COLORS, PRIORITY_OPTIONS } from './constants'
import { toast } from 'sonner'

interface StudyPlanGeneratorProps {
  confirmedCourses: CourseEntry[]
  pendingCourses: CourseEntry[]
  setPendingCourses: React.Dispatch<React.SetStateAction<CourseEntry[]>>
  generatingAI: boolean
  onGenerate: () => void
}

export function StudyPlanGenerator({
  confirmedCourses,
  pendingCourses,
  setPendingCourses,
  generatingAI,
  onGenerate
}: StudyPlanGeneratorProps) {
  const [courseForm, setCourseForm] = React.useState({ course: '', preparation: 30, priority: 'medium' as Priority })

  const handleAddCourse = () => {
    if (!courseForm.course) return
    if (pendingCourses.find(c => c.course.toLowerCase() === courseForm.course.toLowerCase())) return
    if (confirmedCourses.find(c => c.course.toLowerCase() === courseForm.course.toLowerCase())) {   // Make sure no duplicates in either list
      toast.error('This course is already in your plan')
      return
    }
    const colorIndex = (confirmedCourses.length + pendingCourses.length) % COURSE_COLORS.length
    setPendingCourses(prev => [...prev, { ...courseForm, color: COURSE_COLORS[colorIndex], weeklyPlan: [] }])
    setCourseForm({ course: '', preparation: 30, priority: 'medium' as Priority })
  }

  return (
    <Card>
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-gradient-to-r from-[#6B8E23] to-[#556B2F] rounded-full flex items-center justify-center mx-auto mb-3">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-1">AI Study Plan</h3>
        <p className="text-sm text-gray-500">Add courses then generate your schedule</p>
        <p className="text-xs text-gray-400 mt-1 italic">Powered by Gemini — considers your deadlines, priority & prep level</p>
      </div>

      <div className="space-y-3 mb-4">
        <Input label="Course Name" placeholder="e.g., Data Structures"
          value={courseForm.course} onChange={e => setCourseForm({ ...courseForm, course: e.target.value })} />
        <div>
          <label className="block text-sm mb-2 text-gray-700">
            Preparation: <span className="font-semibold text-[#6B8E23]">{courseForm.preparation}%</span>
          </label>
          <input type="range" min="0" max="100" value={courseForm.preparation}
            onChange={e => setCourseForm({ ...courseForm, preparation: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6B8E23]" />
        </div>
        <div>
          <label className="block text-sm mb-2 text-gray-700">Priority</label>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITY_OPTIONS.map(p => (
              <button key={p} onClick={() => setCourseForm({ ...courseForm, priority: p })}
                className={`cursor-pointer px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${courseForm.priority === p
                    ? 'bg-gradient-to-r from-[#6B8E23] to-[#556B2F] text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}>{p}</button>
            ))}
          </div>
        </div>
        <Button onClick={handleAddCourse} fullWidth variant="outline" icon={<Plus className="w-4 h-4" />}>Add Course</Button>
      </div>

      {pendingCourses.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">To Generate</p>
          <AnimatePresence>
            {pendingCourses.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{c.course}</span>
                <span className="text-xs text-gray-400">{c.preparation}% · {c.priority}</span>
                <button onClick={() => setPendingCourses(prev => prev.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {confirmedCourses.length > 0 && (
        <div className="space-y-1 mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Already Confirmed</p>
          {confirmedCourses.map(c => (
            <div key={c.course} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="flex-1 text-sm text-gray-700 truncate">{c.course}</span>
              <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      <Button onClick={onGenerate} fullWidth disabled={!pendingCourses.length || generatingAI} icon={generatingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}>
        {generatingAI ? 'Generating…' : 'Generate with AI'}
      </Button>
    </Card>
  )
}
