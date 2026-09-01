import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/Card'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Plus, BookOpen, FileText, Brain, CheckCircle, Trash2, Pencil } from 'lucide-react'
import { motion } from 'motion/react'
import { useCourses, useCreateCourse, useDeleteCourse, useRenameCourse } from '../hooks/useNotes'

const GRADIENTS = [
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #a855f7, #ec4899)',
    'linear-gradient(135deg, #f97316, #ef4444)',
    'linear-gradient(135deg, #22c55e, #10b981)',
    'linear-gradient(135deg, #6366f1, #a855f7)',
    'linear-gradient(135deg, #eab308, #f97316)',
    'linear-gradient(135deg, #14b8a6, #06b6d4)',
    'linear-gradient(135deg, #f43f5e, rgb(0, 0, 0))',
]

const getColorStyle = (id: string) => {
    const sum = id.replace(/-/g, '').split('').reduce((acc, c) => acc + parseInt(c, 16), 0)
    return { background: GRADIENTS[sum % GRADIENTS.length] }
}

export default function NotesTestPage() {
    const navigate = useNavigate()

    const { data: courses = [], isLoading } = useCourses()
    const { mutate: createCourse, isPending: creating } = useCreateCourse()
    const { mutate: deleteCourse } = useDeleteCourse()
    const { mutate: renameCourse, isPending: renaming } = useRenameCourse()

    const [showAddModal, setShowAddModal]   = useState(false)
    const [newCourseName, setNewCourseName] = useState('')
    const [renamingId, setRenamingId]       = useState<string | null>(null)
    const [renameValue, setRenameValue]     = useState('')

    const handleAddCourse = () => {
        if (!newCourseName.trim()) return
        createCourse(
            { name: newCourseName.trim() },
            {
                onSuccess: () => {
                    setNewCourseName('')
                    setShowAddModal(false)
                },
            }
        )
    }

    const handleCourseClick = (courseId: string) => {
        navigate(`/dashboard/notes/${courseId}`)
    }

    const handleDeleteCourse = (e: React.MouseEvent, courseId: string) => {
        e.stopPropagation()
        deleteCourse(courseId)
    }

    return (
        <>
            <div className="space-y-8 p-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Notes & Test</h1>
                        <p className="text-gray-600 text-sm sm:text-base">Manage your course materials and practice tests</p>
                    </div>
                    <Button onClick={() => setShowAddModal(true)} icon={<Plus className="w-5 h-5" />}>
                        Add Course
                    </Button>
                </div>

                {/* Skeleton while loading */}
                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                                <div className="h-32 bg-green-50 rounded-xl mb-4" />
                                <div className="h-5 bg-gray-200 rounded w-2/3 mb-4" />
                                <div className="space-y-3">
                                    {[1, 2, 3].map((j) => <div key={j} className="h-4 bg-gray-100 rounded" />)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Courses Grid */}
                {!isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                        {courses.map((course, index) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative group"
                            >
                                <Card hoverable onClick={() => handleCourseClick(course.id)}>
                                    {/* Gradient box */}
                                    <div
                                        className="h-24 sm:h-32 rounded-xl mb-4 flex items-center justify-center"
                                        style={getColorStyle(course.id)}
                                    >
                                        <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-white opacity-80" />
                                    </div>

                                    {/* Course name row with action buttons */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base sm:text-xl font-semibold text-gray-900 truncate pr-2">{course.name}</h3>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setRenamingId(course.id); setRenameValue(course.name) }}
                                                title="Rename"
                                                className="cursor-pointer p-1.5 rounded-lg hover:bg-blue-100 text-blue-400 hover:text-blue-600"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteCourse(e, course.id)}
                                                title="Delete"
                                                className="cursor-pointer p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <FileText className="w-4 h-4" />
                                                <span>Files</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{course.filesCount}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Brain className="w-4 h-4" />
                                                <span>Flashcards</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{course.flashcardsCount}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <CheckCircle className="w-4 h-4" />
                                                <span>MCQs</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{course.mcqsCount}</span>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}

                        {/* Add Course Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: courses.length * 0.1 }}
                        >
                            <Card
                                hoverable
                                onClick={() => setShowAddModal(true)}
                                className="border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[260px] sm:min-h-[323px] cursor-pointer hover:border-[#6B8E23] hover:bg-green-50"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#6B8E23]/10">
                                        <Plus className="w-8 h-8 text-[#6B8E23] opacity-70" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-[#6B8E23] mb-2">Add New Course</h3>
                                    <p className="text-sm text-gray-400">Create a new course to organize your materials</p>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Add Course Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); setNewCourseName('') }}
                title="Add New Course"
            >
                <div className="space-y-4">
                    <Input
                        label="Course Name"
                        placeholder="e.g., Data Structures & Algorithms"
                        value={newCourseName}
                        onChange={(e) => setNewCourseName(e.target.value)}
                        required
                    />
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => { setShowAddModal(false); setNewCourseName('') }}
                            fullWidth
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddCourse}
                            disabled={creating || !newCourseName.trim()}
                            fullWidth
                        >
                            {creating ? 'Creating...' : 'Create Course'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Rename Course Modal */}
            <Modal
                isOpen={!!renamingId}
                onClose={() => { setRenamingId(null); setRenameValue('') }}
                title="Rename Course"
            >
                <div className="space-y-4">
                    <Input
                        label="New Name"
                        placeholder="e.g., Operating Systems"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        required
                    />
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => { setRenamingId(null); setRenameValue('') }}
                            fullWidth
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (!renamingId || !renameValue.trim()) return
                                renameCourse(
                                    { courseId: renamingId, name: renameValue.trim() },
                                    { onSuccess: () => { setRenamingId(null); setRenameValue('') } }
                                )
                            }}
                            disabled={renaming || !renameValue.trim()}
                            fullWidth
                        >
                            {renaming ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    )
}