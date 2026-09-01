import { Card, ProgressBar } from './Common'

interface CompletionRatesProps {
  summary: any
}

export const CompletionRates = ({ summary }: CompletionRatesProps) => (
  <Card className="p-6">
    <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
      Completion Rates
    </h2>
    <div className="mt-5 space-y-5">
      {[
        { label: 'This week (schedule)', value: summary.currentWeekCompletionRate },
        { label: 'MCQ accuracy',         value: summary.mcqAccuracy },
        { label: 'Flashcard mastery',    value: summary.flashcardMasteryRate },
      ].map(({ label, value }) => (
        <div key={label}>
          <div className="mb-2 flex justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ color: 'var(--text-muted)' }}>{value}%</span>
          </div>
          <ProgressBar value={value} />
        </div>
      ))}
    </div>
  </Card>
)

interface EngagementCardProps {
  summary: any
  strongestCourse: any
}

export const EngagementCard = ({ summary, strongestCourse }: EngagementCardProps) => (
  <Card className="p-6">
    <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
      Learning Engagement
    </h2>
    <div className="mt-5 grid grid-cols-2 gap-4">
      {[
        { label: 'Courses', value: summary.coursesCreated },
        { label: 'Files',   value: summary.filesUploaded },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl p-4" style={{ background: 'var(--bg-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
        </div>
      ))}
    </div>
    {strongestCourse && (
      <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        Top quiz course:{' '}
        <span style={{ color: 'var(--text-secondary)' }}>{strongestCourse.courseName}</span>{' '}
        ({strongestCourse.mcqAccuracy}% accuracy)
      </p>
    )}
  </Card>
)

interface CoursePerformanceTableProps {
  courseBreakdown: any[]
}

export const CoursePerformanceTable = ({ courseBreakdown }: CoursePerformanceTableProps) => (
  <Card className="p-6">
    <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
      Course Performance
    </h2>
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            {['Course', 'Files', 'Flashcards', 'Flashcard Mastery', 'MCQs', 'Attempts', 'Accuracy'].map((h) => (
              <th key={h} className="py-3 pr-4 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courseBreakdown.map((course) => (
            <tr key={course.courseId} className="border-b"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              <td className="py-3 pr-4 font-medium">{course.courseName}</td>
              <td className="py-3 pr-4">{course.filesCount}</td>
              <td className="py-3 pr-4">{course.flashcardsCount}</td>
              <td className="py-3 pr-4">{course.flashcardMastery}%</td>
              <td className="py-3 pr-4">{course.mcqsCount}</td>
              <td className="py-3 pr-4">{course.mcqAttempts}</td>
              <td className="py-3 pr-4">{course.mcqAccuracy}%</td>
            </tr>
          ))}
          {courseBreakdown.length === 0 && (
            <tr>
              <td className="py-8 text-center" colSpan={6} style={{ color: 'var(--text-faint)' }}>
                No course activity yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </Card>
)
