import { useLayoutEffect, useRef, useState } from 'react';
import { useMessages, useSendMessage } from '../../hooks/useMessages';
import { MessageItem } from './MessageItem';
import { useAITyping } from '../../hooks/useAITyping';
import { Bot, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Whiteboard from '../Whiteboard';

interface Props {
  groupId: string;
  groupName: string;
  currentUserId: string;
  currentUserName: string;
  currentUserColor: string;
  isAdmin: boolean;
  onlineCount: number;
  onBack?: () => void;
}

interface MessagesWindowProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  allMessages: any[];
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
  isAITyping: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  input: string;
  setInput: (val: string) => void;
  handleSend: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isSending: boolean;
}

export const ChatWindow = ({ groupId, groupName, currentUserId, currentUserName, currentUserColor, isAdmin, onlineCount, onBack }: Props) => {
  const [input, setInput] = useState('');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMessages(groupId);

  const sendMessage = useSendMessage(groupId);
  const isAITyping = useAITyping(groupId);

  // Flatten pages in reverse so older pages (loaded later) appear at the top
  const allMessages = data?.pages.slice().reverse().flatMap((page) => page.messages) ?? [];

  const prevPageCountRef = useRef(0);
  // Tracks scroll height from the previous render to calculate how much height was added
  const prevScrollHeightRef = useRef(0);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const pageCount = data?.pages.length ?? 0;
    const isLoadingOlderMessages = prevPageCountRef.current > 0 && pageCount > prevPageCountRef.current;
    prevPageCountRef.current = pageCount;

    if (isLoadingOlderMessages) {
      // Restore scroll position: shift by exactly the height that was added at the top.
      // prevScrollHeightRef holds the scrollHeight from before this render.
      const heightAdded = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop += heightAdded;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    // Always update prevScrollHeight for the next render
    prevScrollHeightRef.current = container.scrollHeight;
  }, [allMessages.length, isAITyping]);


  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage.mutate(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-faint)]">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">
      {/* Header */}
      <div className='flex justify-between items-center border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3'>
      <div className="flex items-center gap-3">
        {onBack && (
          <button 
            onClick={onBack}
            className="md:hidden flex items-center justify-center p-2 -ml-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-[var(--text-primary)] flex items-center justify-center text-[var(--bg-page)] font-semibold text-sm shrink-0">
          {groupName[0].toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-[var(--text-primary)] truncate">{groupName}</span>
          <span className="text-xs text-[var(--text-muted)] font-medium">{onlineCount} online</span>
        </div>
      </div>
      <div className="">
        <button 
          onClick={() => setShowWhiteboard(!showWhiteboard)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all cursor-pointer"
        >
            {showWhiteboard ? 'Back to Chat' : 'Open Whiteboard'}
        </button>
        </div>
      </div>

      {showWhiteboard ? (
        <div className="flex-1 relative">
          <Whiteboard groupId={groupId} userId={currentUserId} userName={currentUserName} userColor={currentUserColor} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
            <MessagesWindow
              scrollContainerRef={scrollContainerRef}
              bottomRef={bottomRef}
              allMessages={allMessages}
              groupId={groupId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              isAITyping={isAITyping}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              handleKeyDown={handleKeyDown}
              isSending={sendMessage.isPending}
            />
        </div>
      )}


    </div>
  );
};

const MessagesWindow = ({
  scrollContainerRef,
  bottomRef,
  allMessages,
  groupId,
  currentUserId,
  isAdmin,
  isAITyping,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  input,
  setInput,
  handleSend,
  handleKeyDown,
  isSending
}: MessagesWindowProps) => {
  return (
    <>
            {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3 bg-[var(--bg-page)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Load more */}
        {hasNextPage && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-full px-4 py-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {isFetchingNextPage ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}


        {allMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            groupId={groupId}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        ))}

        <AnimatePresence>
          {isAITyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-start mb-2"
            >
              <div className="relative max-w-xs lg:max-w-md items-start flex flex-col">
                <span className="text-xs font-medium text-[var(--text-faint)] mb-1 ml-1"><Bot size={22} /></span>
                <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-3 py-1 shadow-sm flex gap-1 items-center h-8">
                  <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-1 sm:px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-surface)] flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a msg or try @ai help..."
          rows={1}
          className={`flex-1 resize-none rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all ${input.startsWith('@ai') || input.startsWith('@docs')
            ? 'bg-[#6B8E23]/10 border border-[#6B8E23]/40 text-[#6B8E23] dark:text-[#A9BA9D] focus:ring-[#6B8E23]/50 placeholder:text-[#6B8E23]/50'
            : 'bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:ring-[var(--border-strong)] placeholder:text-[var(--text-faint)]'
            }`}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          className="cursor-pointer bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 text-[var(--bg-page)] rounded-lg px-2.5 sm:px-5 py-2 sm:py-2.5 text-sm font-medium"
        >
          Send
        </button>
      </div>    
    </>
  )
}