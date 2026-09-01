import { LayoutDashboard, MessageSquare, FileText, Calendar, TrendingUp } from 'lucide-react'

export interface NavItem {
    name: string
    path: string
    icon: React.ReactNode
}

export const navItems: NavItem[] = [
    { name: 'Dashboard',    path: '/dashboard',            icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Group Chat',   path: '/dashboard/group-chat', icon: <MessageSquare className="w-5 h-5" /> },
    { name: 'Notes & Test', path: '/dashboard/notes',      icon: <FileText className="w-5 h-5" /> },
    { name: 'Scheduler',    path: '/dashboard/scheduler',  icon: <Calendar className="w-5 h-5" /> },
    { name: 'Progress',     path: '/dashboard/progress',   icon: <TrendingUp className="w-5 h-5" /> },
]
