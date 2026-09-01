import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X, Bot, SendHorizontal } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

type ChatMessage = {
    id: string | number
    role: 'user' | 'assistant'
    content: string
}

export interface ChatbotProps {
    messages: ChatMessage[]
    isStreaming: boolean
    onSendMessage: (content: string, docs: boolean) => void
    isChatWindowOpen?: boolean
}

const Chatbot = ({ messages, isStreaming, onSendMessage, isChatWindowOpen = false }: ChatbotProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState('')
    const [chatWithDocs, setChatWithDocs] = useState(false)
    const endRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (isOpen) {
            const timeout = setTimeout(() => {
                endRef.current?.scrollIntoView({ behavior: 'instant' })
            }, 50)
            return () => clearTimeout(timeout)
        }
    }, [isOpen])

    const shouldShowTyping = useMemo(() => {
        if (!isStreaming) return false
        const lastMessage = messages[messages.length - 1]
        if (!lastMessage) return true

        return lastMessage.role === 'user' || lastMessage.content.trim().length === 0
    }, [isStreaming, messages])

    const handleSend = () => {
        const content = input.trim()
        if (!content || isStreaming) return

        onSendMessage(content, chatWithDocs)
        setInput('')
    }

    return (
        <div className={`fixed right-4 z-50 transition-all duration-300 ${isChatWindowOpen ? 'bottom-14' : 'bottom-4'}`}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="chatbot-panel"
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{
                            opacity: { duration: 0.25, ease: 'easeOut' },
                            scale: { type: 'spring', stiffness: 300, damping: 25 },
                            y: { type: 'spring', stiffness: 300, damping: 25 },
                        }}
                        style={{ transformOrigin: 'bottom right' }}
                        className="fixed inset-0 sm:static sm:mb-3 flex h-[100dvh] w-full sm:h-[700px] sm:w-90 flex-col overflow-hidden rounded-none sm:rounded-2xl bg-[#0B0B0B] sm:bg-[#0B0B0B]/80 backdrop-blur-[12px] border-none sm:border sm:border-[#ffffff10] shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-[#1F1F1F] px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="grid h-7 w-7 place-items-center rounded-full bg-[#1F1F1F] text-white/80 border border-[#ffffff10]">
                                    <Bot size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white/90">SynapseFlow AI</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded-md p-1.5 cursor-pointer text-white/40 transition hover:bg-white/10 hover:text-white/90 duration-300"
                                aria-label="Close chatbot"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto px-4 [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#ffffff20] [&::-webkit-scrollbar-thumb]:rounded-full">
                            {messages.map((message) => {
                                const isUser = message.role === 'user'

                                return (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed rounded-2xl border ${isUser
                                                ? 'rounded-br-sm bg-[#1A1A1A] text-white/90 border-[#ffffff10]'
                                                : 'rounded-bl-sm bg-[#0B0B0B] text-white/80 border-[#1F1F1F] shadow-sm'
                                                }`}
                                        >
                                            {isUser ? (
                                                <span className="whitespace-pre-wrap wrap-break-word">{message.content}</span>
                                            ) : (
                                                <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                    >
                                                        {message.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}

                            {shouldShowTyping && (
                                <div className="flex justify-start">
                                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-[#0B0B0B] border border-[#1F1F1F] px-4 py-3">
                                        {[0, 1, 2].map((index) => (
                                            <motion.span
                                                key={index}
                                                className="h-1.5 w-1.5 rounded-full bg-white/40"
                                                animate={{ opacity: [0.3, 1, 0.3] }}
                                                transition={{
                                                    duration: 1.2,
                                                    repeat: Infinity,
                                                    ease: 'easeInOut',
                                                    delay: index * 0.2,
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div ref={endRef} />
                        </div>

                        <div className="p-3 border-t border-[#1F1F1F] bg-[#0B0B0B]/50 flex flex-col gap-3">

                            <motion.button
                                type="button"
                                onClick={() => setChatWithDocs(!chatWithDocs)}
                                layout
                                className={`flex items-center justify-center w-1/2 p-1 rounded-xl border transition-all duration-300 overflow-hidden ${chatWithDocs
                                        ? 'border-blue-500/50 bg-[#2A2A2A]/40 backdrop-blur-sm'
                                        : 'border-[#ffffff10] bg-transparent hover:bg-white/5'
                                    }`}
                            >
                                <span className={`cursor-pointer text-[12px] font-medium transition-colors duration-200 mx-2 ${chatWithDocs ? 'text-blue-100' : 'text-white/60'}`}>
                                    Chat with your docs
                                </span>
                                <AnimatePresence>
                                    {chatWithDocs && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <X size={14} className="text-white/80" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>

                            <div className="flex items-center gap-2 rounded-xl bg-[#141414] border border-[#ffffff05] px-2 py-1 focus-within:border-[#ffffff20] focus-within:bg-[#1A1A1A] transition-colors">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleSend()
                                        }
                                    }}
                                    placeholder="Ask SynapseFlow AI..."
                                    disabled={isStreaming}
                                    className="h-9 flex-1 bg-transparent px-2 text-[13px] text-white/90 outline-none transition placeholder:text-white/30 disabled:cursor-not-allowed"
                                />

                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={isStreaming || !input.trim()}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 disabled:cursor-not-allowed ${input.trim()
                                        ? 'text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 scale-100'
                                        : 'text-white/20 scale-95'
                                        }`}
                                >
                                    <SendHorizontal size={14} className={input.trim() ? "translate-x-0.5" : ""} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>



            {
                !isOpen && (
                    <button
                        type="button"
                        onClick={() => setIsOpen((prev) => !prev)}
                        className="grid cursor-pointer h-14 w-14 place-items-center rounded-full bg-[#0B0B0B] border border-[#ffffff] text-white/80 shadow-2xl transition-all hover:bg-[#141414] hover:text-white hover:scale-105 duration-150 backdrop-blur-md"
                        aria-label={isOpen ? 'Close SynapseFlow AI' : 'Open SynapseFlow AI'}
                    >
                        <motion.span>
                            <Bot size={22} />
                        </motion.span>
                    </button>
                )
            }
        </div>
    )
}

export default Chatbot
