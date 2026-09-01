import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'
import { toast } from 'sonner'

export type Message = {
	id: string | number
	role: 'user' | 'assistant'
	content: string
}

type HistoryApiMessage = {
	id?: string | number
	_id?: string | number
	role?: unknown
	content?: unknown
}

type HistoryApiResponse = {
	messages?: unknown
}

const toMessageList = (payload: unknown): Message[] => {
	const maybeArray = (Array.isArray(payload)
		? payload
		: typeof payload === 'object' && payload !== null && Array.isArray((payload as HistoryApiResponse).messages)
		  ? (payload as HistoryApiResponse).messages
		  : []) as unknown[];

	return maybeArray.map((item: unknown, index: number) => {
		const record = (typeof item === 'object' && item !== null ? item : {}) as HistoryApiMessage

		return {
			id: record.id ?? record._id ?? `history-${index}`,
			role: record.role === 'assistant' ? 'assistant' : 'user',
			content: typeof record.content === 'string' ? record.content : '',
		}
	})
}

export const useCopilot = () => {
	const [messages, setMessages] = useState<Message[]>([])
	const [isStreaming, setIsStreaming] = useState(false)
	const didSeedHistoryRef = useRef(false)

	const { data: historyData, isLoading: isLoadingHistory } = useQuery({
		queryKey: ['copilot-history'],
		queryFn: async () => {
			const { data } = await api.get('/ai/chatbot/history')
			return data
		},
	})

	useEffect(() => {
		if (didSeedHistoryRef.current) return
		if (historyData === undefined) return

		setMessages(toMessageList(historyData))
		didSeedHistoryRef.current = true
	}, [historyData])

	const sendMessage = async (content: string, docs: boolean = false) => {
		const trimmedContent = content.trim()
		if (!trimmedContent) return

		const now = Date.now()
		const userMessageId = `user-${now}`
		const placeholderId = `assistant-${now}-placeholder`

		setMessages((prev) => [
			...prev,
			{ id: userMessageId, role: 'user', content: trimmedContent },
		])
		setIsStreaming(true)

		try {
			const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/ai/chatbot`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ content: trimmedContent, docs }),
			})

			if (response.status === 429 || response.status === 503) {
				const errorMsg = response.status === 429 
					? 'Please wait 5 seconds before sending another message.'
					: 'Copilot is currently experiencing high demand. Please try again later.';
				toast.error(errorMsg)
				setMessages((prev) => prev.filter((msg) => msg.id !== userMessageId))
				return
			}

			if (!response.ok || !response.body) {
				throw new Error('Failed to start chatbot stream')
			}

			const reader = response.body.getReader()
			const decoder = new TextDecoder()
			let buffer = ''
			let shouldStop = false

			while (!shouldStop) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split('\n')
				buffer = lines.pop() ?? ''

				for (const rawLine of lines) {
					const line = rawLine.trim()
					if (!line.startsWith('data:')) continue

					const payload = line.replace(/^data:\s?/, '').replace(/\\n/g, '\n')

					if (payload === '[DONE]') {
						shouldStop = true
						break
					}

					if (payload.startsWith('[ERROR]')) {
						const errorMessage = payload.replace('[ERROR] ', '') || 'Something went wrong, Please try again'
						setMessages((prev) => {
							const hasPlaceholder = prev.some((m) => m.id === placeholderId)
							if (hasPlaceholder) {
								return prev.map((m) =>
									m.id === placeholderId
										? { ...m, content: errorMessage }
										: m,
								)
							}

							return [
								...prev,
								{ id: placeholderId, role: 'assistant', content: errorMessage },
							]
						})
						shouldStop = true
						continue
					}

					setMessages((prev) => {
						const hasPlaceholder = prev.some((m) => m.id === placeholderId)

						if (hasPlaceholder) {
							return prev.map((m) =>
								m.id === placeholderId
									? { ...m, content: m.content + payload }
									: m,
							)
						}

						return [
							...prev,
							{ id: placeholderId, role: 'assistant', content: payload },
						]
					})
				}
			}
		} catch {
			setMessages((prev) => {
				const hasPlaceholder = prev.some((m) => m.id === placeholderId)
				if (hasPlaceholder) {
					return prev.map((m) =>
						m.id === placeholderId
							? { ...m, content: 'Something went wrong, please try again' }
							: m,
					)
				}

				return [
					...prev,
					{ id: placeholderId, role: 'assistant', content: 'Something went wrong, please try again' },
				]
			})
		} finally {
			setIsStreaming(false)
		}
	}

	return {
		messages,
		isStreaming,
		sendMessage,
		isLoadingHistory,
	}
}

export default useCopilot
