import { ChevronRight, LogOut, Settings } from 'lucide-react'
import { motion } from 'motion/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { navItems } from './navigation'

export function Sidebar({
    isOpen,
    setIsOpen,
    surface,
    border,
    textPri,
    textMut,
    hoverBg,
    hoverRed,
    setShowSettings,
    logout,
    isPending,
}: {
    isOpen: boolean
    setIsOpen: (v: boolean) => void
    surface: string
    border: string
    textPri: string
    textMut: string
    hoverBg: string
    hoverRed: string
    setShowSettings: (v: boolean) => void
    logout: () => void
    isPending: boolean
}) {
    const location = useLocation()
    const navigate = useNavigate()

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`fixed lg:relative z-40 lg:z-auto h-full flex flex-col shrink-0 transition-transform duration-300 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
                style={{
                    width: '256px',
                    backgroundColor: surface,
                    borderRight: `1px solid ${border}`,
                }}
            >
                {/* Logo */}
                <div style={{ padding: '24px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        
                        <div className='flex justify-center items-center '>
                            <img src="/logo.webp" alt="logo" className='size-7'/>
                        </div>
                        <span style={{
                            fontSize: '18px', fontWeight: 700,
                            background: 'linear-gradient(to right, #6B8E23, #556B2F)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            SynapseFlow
                        </span>
                    </div>
                </div>

                {/* Nav items */}
                <nav style={{
                    flex: 1,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    overflowY: 'auto',
                }}>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path)
                                    if (window.innerWidth < 768) setIsOpen(false)
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                    background: isActive
                                        ? 'linear-gradient(to right, #6B8E23, #556B2F)'
                                        : 'transparent',
                                    color: isActive ? '#ffffff' : textPri,
                                    boxShadow: isActive
                                        ? '0 4px 14px rgba(107,142,35,0.35)'
                                        : 'none',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive)
                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverBg
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive)
                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                                }}
                            >
                                <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                                <span style={{ flex: 1 }}>{item.name}</span>
                                {isActive && <ChevronRight className="w-4 h-4" />}
                            </button>
                        )
                    })}
                </nav>

                {/* Bottom actions: Settings + Logout */}
                <div style={{ padding: '16px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
                    {/* Settings button */}
                    <button
                        onClick={() => {
                            setShowSettings(true)
                            if (window.innerWidth < 768) setIsOpen(false)
                        }}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'transparent',
                            color: textMut,
                            fontWeight: 500,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            marginBottom: '4px',
                        }}
                        onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverBg
                            ;(e.currentTarget as HTMLButtonElement).style.color = textPri
                        }}
                        onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                            ;(e.currentTarget as HTMLButtonElement).style.color = textMut
                        }}
                    >
                        <Settings className="w-5 h-5" style={{ flexShrink: 0 }} />
                        <span>Settings</span>
                    </button>

                    {/* Logout button */}
                    <button
                        onClick={() => logout()}
                        disabled={isPending}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'transparent',
                            color: textMut,
                            fontWeight: 500,
                            fontSize: '14px',
                            cursor: isPending ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverRed
                            ;(e.currentTarget as HTMLButtonElement).style.color = '#ef4444'
                        }}
                        onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                            ;(e.currentTarget as HTMLButtonElement).style.color = textMut
                        }}
                    >
                        <LogOut className="w-5 h-5" style={{ flexShrink: 0 }} />
                        <span>{isPending ? 'Logging out…' : 'Logout'}</span>
                    </button>
                </div>
            </motion.aside>
        </>
    )
}
