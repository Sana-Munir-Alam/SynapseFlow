import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Upload, Download, Trash2, FileText, Loader2, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import mammoth from 'mammoth'
import { api } from '../../lib/axios'
import { Button } from '../Button'
import { useFiles, useFile, useUploadFile, useDeleteFile } from '../../hooks/useNotes'
import { getDownloadUrl, getPreviewUrl, type CourseFile } from '../../services/notes.service'
import { formatBytes, formatRelativeDate } from './types'
import { TabPanel, EmptyState } from './Shared'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export function FilesTab({ courseId }: { courseId: string }) {
    const { data: files = [], isLoading } = useFiles(courseId)
    const { mutate: upload, isPending: uploading } = useUploadFile(courseId)
    const { mutate: remove } = useDeleteFile(courseId)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const pdfContainerRef = useRef<HTMLDivElement>(null)
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
    const [numPages, setNumPages] = useState(0)
    const [pageNumber, setPageNumber] = useState(1)
    const [viewerWidth, setViewerWidth] = useState(800)
    const { data: fetchedFile, isLoading: loadingFile } = useFile(selectedFileId ?? '', courseId)

    const [docxHtml, setDocxHtml] = useState<string>('')
    const [loadingDocx, setLoadingDocx] = useState(false)
    const [docxError, setDocxError] = useState(false)

    const viewerFile = fetchedFile ?? (selectedFileId ? files.find((f) => f.id === selectedFileId) ?? null : null)

    const pdfFile = useMemo(() => ({
        url: selectedFileId ? getPreviewUrl(selectedFileId) : '',
        withCredentials: true
    }), [selectedFileId])

    const isPdfFile = (file: CourseFile) =>
        file.mimeType === 'application/pdf' || file.originalName.toLowerCase().endsWith('.pdf')

    const isDocxFile = (file: CourseFile) =>
        file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.originalName.toLowerCase().endsWith('.docx') ||
        file.originalName.toLowerCase().endsWith('.doc')

    const isPreviewableFile = (file: CourseFile) => isPdfFile(file) || isDocxFile(file)

    const openViewer = (file: CourseFile) => {
        if (!isPreviewableFile(file)) return

        setSelectedFileId(file.id)
        setPageNumber(1)
        setNumPages(0)
        setDocxHtml('')
        setDocxError(false)
    }

    const closeViewer = () => {
        setSelectedFileId(null)
        setPageNumber(1)
        setNumPages(0)
        setDocxHtml('')
        setDocxError(false)
    }

    useEffect(() => {
        if (!viewerFile || !isDocxFile(viewerFile)) return

        const fetchDocx = async () => {
            setLoadingDocx(true)
            setDocxError(false)
            try {
                const res = await api.get(getPreviewUrl(viewerFile.id), { responseType: 'arraybuffer' })
                const result = await mammoth.convertToHtml({ arrayBuffer: res.data })
                setDocxHtml(result.value)
            } catch (err) {
                console.error('Failed to load DOCX', err)
                setDocxError(true)
            } finally {
                setLoadingDocx(false)
            }
        }
        fetchDocx()
    }, [viewerFile])

    useEffect(() => {
        if (!viewerFile) return

        const setWidth = () => {
            const containerWidth = pdfContainerRef.current?.clientWidth ?? 400
            setViewerWidth(Math.max(400, Math.min(800, containerWidth - 48)))
        }

        setWidth()
        window.addEventListener('resize', setWidth)
        return () => window.removeEventListener('resize', setWidth)
    }, [selectedFileId])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        upload(file)
        e.target.value = ''
    }

    return (
        <TabPanel>
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-500">
                    {isLoading ? 'Loading...' : `${files.length} file${files.length !== 1 ? 's' : ''} uploaded`}
                </p>
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        icon={uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    >
                        {uploading ? 'Uploading...' : 'Upload Files'}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : files.length === 0 ? (
                <EmptyState
                    icon={<FileText className="w-8 h-8 text-gray-400" />}
                    message="No files uploaded yet"
                    hint="Upload PDFs, Word docs, or slides to get started"
                />
            ) : (
                <div className="space-y-3">
                    {files.map((file) => (
                        <motion.div
                            key={file.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-[#6B8E23]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{file.originalName}</p>
                                <p className="text-xs text-gray-500">{formatBytes(file.sizeBytes)} • {formatRelativeDate(file.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openViewer(file)}
                                    disabled={!isPreviewableFile(file)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isPreviewableFile(file)
                                        ? 'hover:bg-blue-50 cursor-pointer'
                                        : 'opacity-40 cursor-not-allowed'
                                        }`}
                                    title={isPreviewableFile(file) ? 'Preview Document' : 'Preview available for PDF and DOCX only'}
                                >
                                    <Eye className="w-4 h-4 text-gray-600" />
                                </button>
                                <a
                                    href={getDownloadUrl(file.id)}
                                    download={file.originalName}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
                                    title="Download"
                                >
                                    <Download className="w-4 h-4 text-gray-600" />
                                </a>
                                <button
                                    onClick={() => remove(file.id)}
                                    className="cursor-pointer w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {selectedFileId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm p-4 md:p-8"
                    >
                        <div className="h-full w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm text-gray-500">Preview</p>
                                    <p className="font-semibold text-gray-900 truncate">{viewerFile?.originalName ?? 'Loading...'}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeViewer}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4 text-gray-700" />
                                </button>
                            </div>

                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                                        disabled={pageNumber <= 1 || Boolean(viewerFile && isDocxFile(viewerFile))}
                                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                                        title="Previous page"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-gray-700" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPageNumber((p) => Math.min(numPages || 1, p + 1))}
                                        disabled={numPages === 0 || pageNumber >= numPages || Boolean(viewerFile && isDocxFile(viewerFile))}
                                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                                        title="Next page"
                                    >
                                        <ChevronRight className="w-4 h-4 text-gray-700" />
                                    </button>
                                    <span className="text-sm text-gray-600 ml-1">
                                        {(viewerFile && isDocxFile(viewerFile)) ? 'Document' : `Page ${pageNumber}${numPages ? ` / ${numPages}` : ''}`}
                                    </span>
                                </div>

                                <a
                                    href={getDownloadUrl(selectedFileId)}
                                    download={viewerFile?.originalName ?? 'file'}
                                    className="text-sm text-[#6B8E23] font-medium hover:underline"
                                >
                                    Download file
                                </a>
                            </div>

                            <div ref={pdfContainerRef} className="flex-1 overflow-auto bg-gray-100 p-3 md:p-6">
                                {loadingFile ? (
                                    <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">
                                        Validating file access...
                                    </div>
                                ) : viewerFile && isDocxFile(viewerFile) ? (
                                    <div className="w-full max-w-4xl mx-auto bg-white p-8 shadow-md rounded-lg text-left prose prose-sm md:prose-base">
                                        {loadingDocx ? (
                                            <div className="h-full w-full flex items-center justify-center text-sm text-gray-500 min-h-[300px]">Loading DOCX...</div>
                                        ) : docxError ? (
                                            <div className="text-sm text-red-500 text-center py-10">Failed to load DOCX preview.</div>
                                        ) : (
                                            <div dangerouslySetInnerHTML={{ __html: docxHtml }} />
                                        )}
                                    </div>
                                ) : (
                                    <Document
                                        file={pdfFile}
                                        loading={<div className="text-sm text-gray-500">Loading PDF...</div>}
                                        error={<div className="text-sm text-red-500">Failed to load PDF preview. Check console for details.</div>}
                                        onLoadSuccess={({ numPages: loadedPages }) => {
                                            setNumPages(loadedPages)
                                            setPageNumber(1)
                                        }}
                                        onLoadError={(error) => console.error('Error while loading document!', error)}
                                    >
                                        <Page
                                            pageNumber={pageNumber}
                                            width={viewerWidth}
                                            renderTextLayer
                                            renderAnnotationLayer
                                            onRenderError={(error) => console.error('Error while rendering page!', error)}
                                            className="mx-auto shadow-md"
                                        />
                                    </Document>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </TabPanel>
    )
}
