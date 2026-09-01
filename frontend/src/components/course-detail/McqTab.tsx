import {
    Brain,
    CheckCircle,
    FileText,
    Loader2,
    RefreshCw,
    RotateCcw,
    Sparkles,
    XCircle,
} from 'lucide-react'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Button } from '../Button'

import {
    useFiles,
    useMcqs,
    useProcessFilesForMcqs,
    useRegenerateMcqs,
    useSubmitMcqAttempt,
} from '../../hooks/useNotes'

import { TabPanel } from './Shared'

type ViewState = 'idle' | 'test' | 'done'

export function McqTab({ courseId }: { courseId: string }) {
    const { data: files = [] } = useFiles(courseId)

    const {
        data: mcqs = [],
        isLoading,
    } = useMcqs(courseId)

    const {
        mutate: processFiles,
        isPending: processing,
    } = useProcessFilesForMcqs(courseId)

    const {
        mutate: regenerate,
        isPending: regenerating,
    } = useRegenerateMcqs(courseId)

    const { mutate: submitAttempt } = useSubmitMcqAttempt(courseId)

    const hasFiles = files.length > 0
    const hasQs = mcqs.length > 0

    // Track file count at last successful processFiles to detect deletions
    const [lastProcessedFileCount, setLastProcessedFileCount] = useState(() => hasQs ? files.length : -1)

    // Dirty when: a file was added after last generation, OR file count changed since last process
    const newestFileAt = files.length ? Math.max(...files.map(f => new Date(f.createdAt).getTime())) : 0
    const newestMcqAt = mcqs.length ? Math.max(...mcqs.map(m => new Date(m.updatedAt).getTime())) : 0
    const hasNewerFiles = hasFiles && hasQs && (newestFileAt > newestMcqAt || files.length !== lastProcessedFileCount)

    const [view, setView] = useState<ViewState>('idle')

    const [testIdx, setTestIdx] = useState(0)
    const [selected, setSelected] = useState<number | null>(null)

    const [answered, setAnswered] = useState(false)

    const [score, setScore] = useState(0)

    const [results, setResults] = useState<
        {
            question: string
            correct: number
            selected: number
        }[]
    >([])

    const handleProcessFiles = () => {
        processFiles(undefined, {
            onSuccess: () => {
                setLastProcessedFileCount(files.length)
                setView('idle')
            },
        })
    }

    const resetTest = () => {
        setTestIdx(0)
        setSelected(null)

        setAnswered(false)

        setScore(0)

        setResults([])
    }

    const handleStart = () => {
        resetTest()
        setView('test')
    }

    const handleAnswer = (idx: number) => {
        if (answered) return

        setSelected(idx)
        setAnswered(true)

        const mcq = mcqs[testIdx]

        const chosen = mcq.options[idx]

        if (!chosen) return

        const correctIndex = mcq.options.findIndex((o) => o.isCorrect)

        if (chosen.isCorrect) {
            setScore((s) => s + 1)
        }

        setResults((r) => [
            ...r,
            {
                question: mcq.question,
                correct: correctIndex,
                selected: idx,
            },
        ])

        submitAttempt({
            mcqId: mcq.id,
            selectedOptionId: chosen.id,
        })
    }

    const handleNext = () => {
        if (testIdx + 1 >= mcqs.length) {
            setView('done')
        } else {
            setTestIdx((i) => i + 1)

            setSelected(null)

            setAnswered(false)
        }
    }

    const handleTestAgain = () => {
        resetTest()
        setView('test')
    }

    const handleRegenerate = () => {
        regenerate(undefined, {
            onSuccess: () => {
                resetTest()
                setView('idle')
            },
        })
    }

    if (isLoading || processing || regenerating) {
        return (
            <TabPanel>
                <div className="flex flex-col items-center gap-4 py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[#6B8E23]" />

                    {(processing || regenerating) && (
                        <p className="text-sm text-gray-500">
                            {processing
                                ? 'Generating MCQs from your files…'
                                : 'Regenerating MCQs…'}
                        </p>
                    )}
                </div>
            </TabPanel>
        )
    }

    if (view === 'idle') {
        return (
            <TabPanel>
                <div className="flex flex-col items-center py-12 gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6B8E23] to-[#556B2F] flex items-center justify-center shadow-lg shadow-green-200">
                        <Brain className="w-10 h-10 text-white" />
                    </div>

                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {hasQs && !hasNewerFiles
                                ? 'Ready to Test Your Knowledge?'
                                : 'Generate MCQs'}
                        </h3>

                        <p className="text-gray-500">
                            {hasQs && !hasNewerFiles
                                ? `${mcqs.length} question${mcqs.length !== 1 ? 's' : ''} ready • Answer all and see your score`
                                : hasNewerFiles
                                    ? 'New files detected — process them to regenerate your questions'
                                    : hasFiles
                                        ? 'Process your uploaded files to generate AI questions'
                                        : 'Upload files in the Files tab first, then process them here'}
                        </p>
                    </div>

                    {!hasFiles && !hasQs && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
                            <FileText className="w-4 h-4 flex-shrink-0" />

                            No files uploaded yet. Go to the Files tab to
                            upload PDFs or Word docs.
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                        {(!hasQs || hasNewerFiles) && (
                            <Button
                                fullWidth
                                disabled={!hasFiles}
                                onClick={handleProcessFiles}
                                icon={<Sparkles className="w-4 h-4" />}
                            >
                                Process Files
                            </Button>
                        )}

                        {hasQs && !hasNewerFiles && (
                            <Button fullWidth onClick={handleStart}>
                                Start Test
                            </Button>
                        )}
                    </div>
                </div>
            </TabPanel>
        )
    }

    if (view === 'done') {
        const percentage = Math.round((score / mcqs.length) * 100)

        return (
            <TabPanel>
                <div className="max-w-xl mx-auto py-4 space-y-6">
                    <div className="text-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6B8E23] to-[#556B2F] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
                            <span className="text-2xl font-bold text-white">
                                {percentage}%
                            </span>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                            Test Complete!
                        </h3>

                        <p className="text-gray-500">
                            You got{' '}
                            <span className="font-bold text-[#6B8E23]">
                                {score}
                            </span>{' '}
                            out of{' '}
                            <span className="font-bold">
                                {mcqs.length}
                            </span>{' '}
                            correct
                        </p>
                    </div>

                    <div className="space-y-3">
                        {results.map((r, i) => {
                            const isCorrect = r.selected === r.correct

                            const mcq = mcqs[i]

                            return (
                                <div
                                    key={i}
                                    className={`p-4 rounded-xl border ${isCorrect
                                            ? 'border-green-200 bg-green-50'
                                            : 'border-red-200 bg-red-50'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isCorrect
                                                    ? 'bg-green-500'
                                                    : 'bg-red-500'
                                                }`}
                                        >
                                            {isCorrect ? (
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-white" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 mb-2 text-sm">
                                                {r.question}
                                            </p>

                                            {!isCorrect && (
                                                <div className="space-y-1">
                                                    <p className="text-xs text-red-600">
                                                        Your answer:{' '}
                                                        <span className="font-semibold">
                                                            {mcq.options[
                                                                r.selected
                                                            ]?.optionText ??
                                                                'N/A'}
                                                        </span>
                                                    </p>

                                                    <p className="text-xs text-green-600">
                                                        Correct answer:{' '}
                                                        <span className="font-semibold">
                                                            {mcq.options[
                                                                r.correct
                                                            ]?.optionText ??
                                                                'N/A'}
                                                        </span>
                                                    </p>
                                                </div>
                                            )}

                                            {isCorrect && (
                                                <p className="text-xs text-green-600 font-medium">
                                                    {mcq.options[r.correct]
                                                        ?.optionText ??
                                                        'Correct'}
                                                </p>
                                            )}

                                            {mcq.explanation && (
                                                <p className="text-xs text-gray-500 mt-1 italic">
                                                    {mcq.explanation}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <Button variant="outline" fullWidth disabled={!hasQs} onClick={handleTestAgain} icon={<RotateCcw className="w-4 h-4" />}>
                                Test Again
                            </Button>

                            <button
                                onClick={handleRegenerate}
                                disabled={!hasFiles || regenerating}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:text-[#6B8E23] hover:border-[#6B8E23]/40 hover:bg-[#6B8E23]/10 disabled:hover:bg-transparent"
                            >
                                <RefreshCw
                                    className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''
                                        }`}
                                />

                                {regenerating ? 'Regenerating…' : 'Regenerate Questions'}
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                resetTest()
                                setView('idle')
                            }}
                            disabled={!hasFiles}
                            className="flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors
                                disabled:opacity-40 disabled:cursor-not-allowed
                                hover:bg-white/10 disabled:hover:bg-transparent"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <FileText className="w-4 h-4" />

                            Process Files
                        </button>
                    </div>
                </div>
            </TabPanel>
        )
    }

    const mcq = mcqs[testIdx]

    return (
        <TabPanel>
            <div className="max-w-xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-500 flex-shrink-0">
                        {testIdx + 1} / {mcqs.length}
                    </p>

                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#6B8E23] to-[#556B2F] rounded-full"
                            initial={{ width: 0 }}
                            animate={{
                                width: `${(testIdx / mcqs.length) * 100}%`,
                            }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                <p className="text-lg font-semibold text-gray-900 leading-relaxed">
                    {mcq.question}
                </p>

                <div className="space-y-3">
                    {mcq.options.map((opt, i) => {
                        let cls = 'hover:border-[#6B8E23]/50 hover:bg-[#6B8E23]/10 cursor-pointer'

                        if (answered) {
                            if (opt.isCorrect) {
                                cls = 'border-green-400 bg-green-50 text-green-800 cursor-default'
                            } else if (i === selected) {
                                cls = 'border-red-400/60 bg-red-500/10 text-red-500 cursor-default'
                            } else {
                                cls = 'opacity-40 cursor-default'
                            }
                        }

                        return (
                            <motion.button
                                key={i}
                                whileHover={
                                    answered ? {} : { scale: 1.01 }
                                }
                                whileTap={
                                    answered ? {} : { scale: 0.99 }
                                }
                                onClick={() => handleAnswer(i)}
                                disabled={answered}
                                className={`w-full text-left px-5 py-4 rounded-xl border transition-all text-sm font-medium ${cls}`}
                            >
                                <span className="font-bold mr-3 text-xs opacity-60">
                                    {String.fromCharCode(65 + i)}
                                </span>

                                {opt.optionText}
                            </motion.button>
                        )
                    })}
                </div>

                <AnimatePresence>
                    {answered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            {mcq.explanation && (
                                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
                                    <span className="font-semibold">
                                        Explanation:
                                    </span>{' '}
                                    {mcq.explanation}
                                </div>
                            )}

                            <Button fullWidth onClick={handleNext}>
                                {testIdx + 1 >= mcqs.length
                                    ? 'See Results'
                                    : 'Next Question →'}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </TabPanel>
    )
}