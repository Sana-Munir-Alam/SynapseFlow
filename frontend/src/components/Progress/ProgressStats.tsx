import { CalendarCheck, Flame, Layers, Target } from 'lucide-react'
import { StatCard } from './Common'

interface ProgressStatsProps {
  summary: any
}

export const ProgressStats = ({ summary }: ProgressStatsProps) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <StatCard
      title="Study Completion"
      value={`${summary.scheduleCompletionRate}%`}
      subtitle={`${summary.completedScheduledSessions} of ${summary.totalScheduledSessions} sessions honoured`}
      icon={<CalendarCheck className="h-6 w-6" />}
    />
    <StatCard
      title="MCQ Accuracy"
      value={`${summary.mcqAccuracy}%`}
      subtitle={`${summary.mcqAttempts} total attempts`}
      icon={<Target className="h-6 w-6" />}
    />
    <StatCard
      title="Flashcard Mastery"
      value={`${summary.flashcardMasteryRate}%`}
      subtitle={`${summary.flashcardsReviewed} cards reviewed`}
      icon={<Layers className="h-6 w-6" />}
    />
    <StatCard
      title="Current Streak"
      value={`${summary.currentStreak} days`}
      subtitle={`Best streak: ${summary.longestStreak} days`}
      icon={<Flame className="h-6 w-6" />}
    />
  </div>
)
