import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSearchGroups, useCreateGroup, useJoinGroup, useLeaveGroup, useDeleteGroup } from '../../hooks/useGroup';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Plus } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

interface SearchGroup {
  id: string;
  name: string;
}

type GroupAction = 'leave' | 'delete';

interface Props {
  myGroups: Group[];
  activeGroupId: string | null;
  onSelectGroup: (group: Group | null) => void;
  className?: string;
}

export const GroupSidebar = ({ myGroups, activeGroupId, onSelectGroup, className = '' }: Props) => {
  const [search, setSearch] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<GroupAction | null>(null);
  const [targetGroup, setTargetGroup] = useState<Group | null>(null);

  const { data: searchResults } = useSearchGroups(search);
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const deleteGroup = useDeleteGroup();

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    createGroup.mutate(newGroupName.trim(), {
      onSuccess: () => {
        setNewGroupName('');
        setShowCreate(false);
      },
    });
  };

  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>, group: Group) => {
    e.stopPropagation();

    setTargetGroup(group);
    setPendingAction('leave');
    setConfirmOpen(true);
  };

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>, group: Group) => {
    e.stopPropagation();

    setTargetGroup(group);
    setPendingAction('delete');
    setConfirmOpen(true);
  };

  const handleConfirmAction = () => {
    if (!targetGroup || !pendingAction) return;

    const mutation = pendingAction === 'delete' ? deleteGroup : leaveGroup;

    mutation.mutate(targetGroup.id, {
      onSuccess: () => {
        if (activeGroupId === targetGroup.id) {
          onSelectGroup(null);
        }

        setConfirmOpen(false);
        setPendingAction(null);
        setTargetGroup(null);
      },
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setConfirmOpen(open);

    if (!open) {
      setPendingAction(null);
      setTargetGroup(null);
    }
  };

  return (
    <div className={`w-full md:w-72 h-full flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] shrink-0 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="font-medium text-[var(--text-primary)]">Chats</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-[1.02] transition-transform text-xl font-light cursor-pointer"
          title="Create group"
        >
          <Plus className={`size-4 ${showCreate ? 'rotate-45' : ''} duration-200`}/>
        </button>
      </div>

      {/* Create group input */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-b border-[var(--border)] bg-[var(--bg-subtle)]"
          >
            <div className="px-4 py-2 flex gap-2">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name..."
                className="flex-1 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] placeholder-[var(--text-faint)]"
              />
              <button
                onClick={handleCreate}
                disabled={createGroup.isPending}
                className="cursor-pointer text-sm bg-[var(--text-primary)] text-[var(--bg-page)] px-2 py-1 rounded-lg hover:bg-[var(--text-secondary)] transition-all disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups..."
          className="w-full text-sm bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border)] rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] placeholder-[var(--text-faint)] transition-colors"
        />
      </div>

      {/* Search results */}
      {search && searchResults && searchResults?.length > 0 && (
        <div className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
          <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider px-4 pt-3 pb-2">Search results</p>
          {searchResults.map((group: SearchGroup) => {
            const alreadyJoined = myGroups.some((g) => g.id === group.id);
            return (
              <div
                key={group.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-surface)] transition-colors"
              >
                <span className="text-sm text-[var(--text-primary)]">{group.name}</span>
                {alreadyJoined ? (
                  <span className="text-xs text-[var(--text-faint)]">Joined</span>
                ) : (
                  <button
                    onClick={() => joinGroup.mutate(group.id)}
                    className="text-xs text-[var(--text-primary)] hover:text-[var(--text-secondary)] font-medium cursor-pointer"
                  >
                    Join
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* My groups */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider px-4 pt-4 pb-2">My Groups</p>
        {myGroups.length === 0 && (
          <p className="text-sm text-[var(--text-faint)] px-4 py-2">
            No groups yet. Create or join one.
          </p>
        )}
        {myGroups.map((group) => {
          const isActive = activeGroupId === group.id;
          return (
            <div key={group.id} className="relative group/item">
              <button
                onClick={() => onSelectGroup(group)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                  isActive 
                    ? 'bg-transparent border-l-2 border-[var(--text-primary)]' 
                    : 'border-l-2 border-transparent hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm shrink-0 transition-colors ${
                  isActive 
                    ? 'bg-[var(--text-primary)] text-[var(--bg-page)]' 
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}>
                  {group.name[0].toUpperCase()}
                </div>
                <span className={`text-sm truncate font-medium transition-colors ${
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}>
                  {group.name}
                </span>
              </button>

              {/* Action button — visible on hover */}
              {group.role === 'admin' ? (
                <button
                  onClick={(e) => handleDelete(e, group)}
                  disabled={deleteGroup.isPending}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 text-xs text-red-500 hover:text-red-400 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-[var(--bg-surface)] px-2 py-1 rounded"
                >
                  Delete
                </button>
              ) : (
                <button
                  onClick={(e) => handleLeave(e, group)}
                  disabled={leaveGroup.isPending}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 text-xs text-red-400 hover:text-red-300 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-[var(--bg-surface)] px-2 py-1 rounded"
                >
                  Leave
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={confirmOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === 'delete' ? 'Delete Group?' : 'Leave Group?'}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              {pendingAction === 'delete'
                ? `This will permanently delete ${targetGroup?.name ?? 'this group'} and all its messages.`
                : `You will leave ${targetGroup?.name ?? 'this group'} and can rejoin later.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={leaveGroup.isPending || deleteGroup.isPending}
              className='cursor-pointer border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmAction}
              disabled={!pendingAction || !targetGroup || leaveGroup.isPending || deleteGroup.isPending}
              className='cursor-pointer bg-red-900/50 text-red-200 hover:bg-red-900 border border-red-900'
            >
              {pendingAction === 'delete' ? 'Delete' : 'Leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};