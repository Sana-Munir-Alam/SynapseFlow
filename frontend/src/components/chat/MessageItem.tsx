import { useState } from 'react';
import { useDeleteForMe, useDeleteForEveryone } from '../../hooks/useMessages';
import { Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { motion, AnimatePresence } from 'motion/react';

interface Sender {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
}

interface Message {
  id: string;
  userId?: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  sender?: Sender;
  senderType?: 'user' | 'ai';
  isSystem?: boolean;
}

interface Props {
  message: Message;
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export const MessageItem = ({ message, groupId, currentUserId, isAdmin }: Props) => {
  const [showOptions, setShowOptions] = useState(false);
  const deleteMe = useDeleteForMe(groupId);
  const deleteEveryone = useDeleteForEveryone(groupId);

  const senderId = message.sender?.id ?? message.userId ?? '';
  const senderUsername = message.sender?.username ?? 'Unknown user';
  const isOwn = senderId === currentUserId;
  const isDeleted = !!message.deletedAt;

  if (message.isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center my-4"
      >
        <span className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-xs px-3 py-1.5 rounded-full border border-[var(--border)] font-medium">
          {message.content}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div className={`relative max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}
        onMouseEnter={() => setShowOptions(true)}
        onMouseLeave={() => setShowOptions(false)}>
        {/* Sender name — only show for others' messages */}
        {!isOwn && (
          <span className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 ml-1">
            {message.senderType === 'ai' ? <Bot size={18} className="inline mr-1" /> : senderUsername}
          </span>
        )}

        <div
          className={`px-4 py-2.5 rounded-lg text-sm leading-relaxed ${isDeleted
            ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)] italic border border-[var(--border)]'
            : isOwn
              ? 'bg-[var(--accent-muted)] text-[var(--text-primary)] border border-[var(--border-strong)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] shadow-sm'
            }`}
        >
          {isDeleted ? 'This message was deleted' : (
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 last:mb-0" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 last:mb-0" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1 last:mb-0" {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] font-medium tracking-wide text-[var(--text-faint)] mt-1.5 mx-1">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>

        {/* Delete options — shown on hover, hidden for deleted messages */}
        <AnimatePresence>
          {showOptions && !isDeleted && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              className={`absolute -top-6 z-10 ${isOwn ? 'right-0' : 'left-0'} flex items-center gap-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1 shadow-md`}
            >
              <button
                onClick={() => deleteMe.mutate(message.id)}
                className="cursor-pointer h-auto! min-h-0! whitespace-nowrap rounded-md px-2.5! py-1! text-[11px]! font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              >
                Delete for me
              </button>
              {/* Delete for everyone — own messages always, any message if admin */}
              {(isOwn || isAdmin) && (
                <button
                  onClick={() => deleteEveryone.mutate(message.id)}
                  className="cursor-pointer h-auto! min-h-0! whitespace-nowrap rounded-md px-2.5! py-1! text-[11px]! font-medium text-red-200 transition-colors bg-red-900/40 hover:bg-red-900 hover:text-white"
                >
                  Delete for all
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};