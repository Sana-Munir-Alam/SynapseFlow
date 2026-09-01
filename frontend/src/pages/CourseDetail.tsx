import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { useCourses } from '../hooks/useNotes'

import { FilesTab } from '../components/course-detail/FilesTab'
import { FlashcardsTab } from '../components/course-detail/FlashcardsTab'
import { McqTab } from '../components/course-detail/McqTab'
import { type Tab } from '../components/course-detail/types'


export default function CourseDetailPage() {
    const { courseId } = useParams<{ courseId: string }>()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<Tab>('files')

    const { data: courses = [] } = useCourses()
    const course = courses.find((c) => c.id === courseId)

    if (!courseId) return null

    return (
        <div className="space-y-6 p-6">
            {/* Back + Title */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/dashboard/notes')}
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{course?.name ?? 'Course'}</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage course materials and practice</p>
                </div>
            </div>

            {/* Tab Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Tab Bar */}
                <div className="flex border-b border-gray-100 px-6 pt-2 gap-1">
                    {(['files', 'flashcards', 'mcq'] as Tab[]).map((tab) => {
                        const labels: Record<Tab, string> = {
                            files: 'Uploaded Files',
                            flashcards: 'Flashcards',
                            mcq: 'MCQ Test',
                        }
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`cursor-pointer px-5 py-3 text-sm font-medium transition-all relative ${activeTab === tab ? 'text-[#6B8E23]' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {labels[tab]}
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="tab-underline"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#6B8E23] to-[#556B2F] rounded-t"
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    <div style={{ display: activeTab === 'files' ? 'block' : 'none' }}><FilesTab courseId={courseId} /></div>
                    <div style={{ display: activeTab === 'flashcards' ? 'block' : 'none' }}><FlashcardsTab courseId={courseId} isActive={activeTab === 'flashcards'} /></div>
                    <div style={{ display: activeTab === 'mcq' ? 'block' : 'none' }}><McqTab courseId={courseId} /></div>
                </div>
            </div>
        </div>
    )
}