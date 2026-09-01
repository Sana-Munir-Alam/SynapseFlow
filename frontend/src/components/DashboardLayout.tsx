import useCopilot from '@/hooks/useCopilot'
import { Bell, Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useLogout } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useScheduler'
import Chatbot from './Chatbot'
import { navItems } from './dashboard/navigation'
import { Sidebar } from './dashboard/Sidebar'
import { NotificationPanel } from './NotificationPanel'
import { SettingsModal } from './SettingsModal'

export function DashboardLayout() {
    const location  = useLocation()
    const { mutate: logout, isPending } = useLogout()
    const { data: notifications = [] }  = useNotifications()
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === 'dark'

    // Dark mode tokens
    const surface  = isDark ? '#1a1d27' : '#ffffff'
    const border   = isDark ? '#2e3347' : '#e5e7eb'
    const pageBg   = isDark ? '#0f1117' : '#f9fafb'
    const textPri  = isDark ? '#f9fafb' : '#111827'
    const textMut  = isDark ? '#9ca3af' : '#6b7280'
    const hoverBg  = isDark ? '#252836' : '#f3f4f6'
    const hoverRed = isDark ? '#2d1515' : '#fef2f2'

    const [showNotifications, setShowNotifications] = useState(false)
    const [showSettings, setShowSettings]           = useState(false)
    const [isSidebarOpen, setIsSidebarOpen]          = useState(false)
    const [isChatWindowOpen, setIsChatWindowOpen]    = useState(false)
    
    const {messages, isStreaming, sendMessage} = useCopilot()

    const unreadCount = notifications.filter((n: { isRead?: boolean }) => !n.isRead).length

    const currentPage = navItems.find((item) => item.path === location.pathname)?.name ?? 'Dashboard'

    return (
        <div style={{
            display: 'flex',
            width: '100vw',
            height: '100dvh',
            overflow: 'hidden',
            backgroundColor: pageBg,
        }}>

            {/* ════ SIDEBAR ════ */}
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                surface={surface}
                border={border}
                textPri={textPri}
                textMut={textMut}
                hoverBg={hoverBg}
                hoverRed={hoverRed}
                setShowSettings={setShowSettings}
                logout={logout}
                isPending={isPending}
            />

            {/* ════ MAIN COLUMN ════ */}
            <div style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                height: '100dvh',
                overflow: 'hidden',
            }}>

                {/* ── Fixed top header ── */}
                <header style={{
                    flexShrink: 0,
                    height: '77px',
                    backgroundColor: surface,
                    borderBottom: `1px solid ${border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    zIndex: 20,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu style={{ width: '18px', height: '18px', color: textPri }} />
                        </button>
                        <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 500, color: textPri }}>
                            {currentPage}
                        </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                        {/* Notification bell */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowNotifications((v) => !v)}
                                style={{
                                    width: '38px', height: '38px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative',
                                    flexShrink: 0,
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverBg
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                                }
                            >
                                <Bell style={{ width: '20px', height: '20px', color: textMut, display: 'block', flexShrink: 0 }} />
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute', top: '2px', right: '2px',
                                        minWidth: '15px', height: '15px',
                                        backgroundColor: '#ef4444', borderRadius: '9999px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontSize: '9px', fontWeight: 700, padding: '0 3px',
                                        pointerEvents: 'none',
                                        zIndex: 1,
                                    }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <NotificationPanel
                                    notifications={notifications}
                                    onClose={() => setShowNotifications(false)}
                                />
                            )}
                        </div>
                    </div>
                </header>

                {/* ── Scrollable page content ── */}
                <main style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    backgroundColor: pageBg,
                }}>
                    <Outlet context={{ setIsChatWindowOpen }} />
                </main>
            </div>

            {/* Settings modal */}
            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

            <Chatbot
                messages={messages}
                isStreaming={isStreaming}
                onSendMessage={sendMessage}
                isChatWindowOpen={isChatWindowOpen}
            />
        </div>
    )
}
