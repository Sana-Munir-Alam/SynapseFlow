import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import { GroupSidebar } from '../components/chat/GroupSidebar';
import { ChatWindow } from '../components/chat/ChatWindow';
import { useMyGroups } from '../hooks/useGroup';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSocket } from '@/hooks/useSocket';
import { useGroupSocket } from '@/hooks/useGroupSocket';
import { useOnlineCount } from '@/hooks/useOnlineCount';

interface Group {
    id: string;
    name: string;
    role: 'admin' | 'member';
}

export const ChatPage = () => {
    const { data: user } = useCurrentUser();
    const { data: my_groups = [] } = useMyGroups();
    const [activeGroup, setActiveGroup] = useState<Group | null>(null);
    const context = useOutletContext<{ setIsChatWindowOpen?: (v: boolean) => void }>();

    useEffect(() => {
        if (context?.setIsChatWindowOpen) {
            context.setIsChatWindowOpen(!!activeGroup);
        }
        return () => {
            if (context?.setIsChatWindowOpen) {
                context.setIsChatWindowOpen(false);
            }
        };
    }, [activeGroup, context]);

    const currentUserId = user?.user?.id ?? user?.id ?? '';
    const currentUserName = user?.user?.username ?? user?.username ?? 'Anonymous';

    // Simple hash for consistent user color
    const currentUserColor = `hsl(${(currentUserId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % 360}, 70%, 50%)`;

    // Connect socket when page loads
    useSocket();

    // Join/leave room when active group changes
    useGroupSocket(activeGroup?.id ?? null);

    const onlineCount = useOnlineCount(activeGroup?.id ?? null);

    // Resolve admin status from my-groups payload to avoid admin-only endpoint calls.
    const isAdmin = activeGroup?.role === 'admin';

    return (
        <div className="flex h-full bg-[var(--bg-page)] text-[var(--text-primary)] font-sans relative overflow-hidden">
            <motion.div
                initial={false}
                animate={{ x: activeGroup && window.innerWidth < 768 ? '-100%' : '0%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-y-0 left-0 z-20 md:relative md:!transform-none flex h-full w-full md:w-auto"
            >
                <GroupSidebar
                    myGroups={my_groups}
                    activeGroupId={activeGroup?.id ?? null}
                    onSelectGroup={setActiveGroup}
                />
            </motion.div>

            <div className="flex-1 flex flex-col overflow-hidden w-full">
                <AnimatePresence mode="wait">
                    {activeGroup ? (
                        <motion.div
                            key={activeGroup.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="flex flex-col h-full"
                        >
                            <ChatWindow
                                groupId={activeGroup.id}
                                groupName={activeGroup.name}
                                currentUserId={currentUserId}
                                currentUserName={currentUserName}
                                currentUserColor={currentUserColor}
                                isAdmin={!!isAdmin}
                                onlineCount={onlineCount}
                                onBack={() => setActiveGroup(null)}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1 flex items-center justify-center text-[var(--text-faint)]"
                        >
                            Select a group to start chatting
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};