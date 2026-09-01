import { CheckCircle2, Clock } from 'lucide-react'
import { motion } from 'motion/react'
import type { CourseEntry } from '../../services/scheduler.service'
import { Button } from '../Button'
import { Card } from '../Card'

interface DraftPlanCardProps {
  plan: CourseEntry
  pi: number
  savingPlan: boolean
  onCancelDraft: (courseName: string) => void
  onConfirmCourse: (plan: CourseEntry) => void
}

export function DraftPlanCard({
  plan,
  pi,
  savingPlan,
  onCancelDraft,
  onConfirmCourse
}: DraftPlanCardProps) {
  return (
    <Card className="border-2 border-dashed border-[#6B8E23]/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
        <h3 className="text-base font-semibold text-gray-900 flex-1">{plan.course}</h3>
        <span className="text-xs text-[#6B8E23] font-medium px-2 py-1 bg-[#6B8E23]/10 rounded-full">Draft</span>
      </div>

      <div className="space-y-2 mb-5">
        {plan.weeklyPlan.map((d, di) => (
          <div key={di} className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-10">{d.dayOfWeek}</span>
            <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden">
              <motion.div initial={{ width: 0 }}
                animate={{ width: `${Math.min((d.hours / 4) * 100, 100)}%` }}
                transition={{ delay: di * 0.05 + pi * 0.1 }}
                className="h-full flex items-center justify-end px-2 rounded-lg"
                style={{ backgroundColor: plan.color }}>
                <span className="text-xs font-semibold text-white">{d.hours}h</span>
              </motion.div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span className="font-semibold">{plan.weeklyPlan.reduce((s, d) => s + d.hours, 0).toFixed(1)}h / week</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onCancelDraft(plan.course)}>Cancel</Button>
          <Button size="sm" icon={<CheckCircle2 className="w-4 h-4" />}
            onClick={() => onConfirmCourse(plan)} disabled={savingPlan}>
            {savingPlan ? 'Saving…' : 'Confirm'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
