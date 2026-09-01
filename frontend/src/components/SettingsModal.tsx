import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, User, Palette, Trash2, AlertTriangle } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../lib/axios'
import { useCurrentUser } from '../hooks/useCurrentUser'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

type SettingsTab = 'account' | 'appearance'

function useDeleteAccount() {
    const navigate = useNavigate()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async () => { await api.delete('/auth/account') },
        onSuccess: () => {
            qc.clear()
            toast.success('Account deleted.')
            navigate('/')
        },
        onError: () => toast.error('Failed to delete account. Please try again.'),
    })
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('account')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    const { theme, setTheme, resolvedTheme } = useTheme()
    const isDark = resolvedTheme === 'dark'

    const { data: currentUserData } = useCurrentUser()
    const user = currentUserData?.user
    const { mutate: deleteAccount, isPending: deleting } = useDeleteAccount()

    // ── color tokens ──────────────────────────────────────────────────────────
    const surface   = isDark ? '#1a1d27' : '#ffffff'
    const sidebar   = isDark ? '#13151f' : '#f9fafb'
    const border    = isDark ? '#2e3347' : '#e5e7eb'
    const textPri   = isDark ? '#f9fafb' : '#111827'
    const textSec   = isDark ? '#e5e7eb' : '#374151'
    const textMut   = isDark ? '#9ca3af' : '#6b7280'
    const inputBg   = isDark ? '#252836' : '#f9fafb'
    const hoverBg   = isDark ? '#252836' : '#f3f4f6'
    const shadow    = isDark ? '0 25px 60px rgba(0,0,0,0.7)' : '0 25px 60px rgba(0,0,0,0.2)'

    const formatDate = (d?: string | Date | null) =>
        d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* ── Backdrop ── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            width: '100vw', height: '100vh',
                            backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            zIndex: 200,
                        }}
                    />

                    {/* ── Modal panel ── */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            width: '100vw', height: '100vh',
                            zIndex: 201,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '16px',
                            boxSizing: 'border-box',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%', maxWidth: '896px', height: '80vh',
                                backgroundColor: surface,
                                borderRadius: '16px',
                                boxShadow: shadow,
                                overflow: 'hidden',
                                display: 'flex',
                            }}
                        >
                            {/* ── Left sidebar ── */}
                            <div style={{
                                width: '220px', flexShrink: 0,
                                backgroundColor: sidebar,
                                borderRight: `1px solid ${border}`,
                                padding: '24px 16px',
                                display: 'flex', flexDirection: 'column',
                            }}>
                                <p style={{
                                    fontSize: '18px', fontWeight: 700, color: textPri,
                                    marginBottom: '20px', paddingLeft: '8px',
                                }}>
                                    Settings
                                </p>
                                <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {([
                                        { id: 'account' as const,    label: 'Account',    Icon: User    },
                                        { id: 'appearance' as const, label: 'Appearance', Icon: Palette },
                                    ]).map(({ id, label, Icon }) => {
                                        const active = activeTab === id
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => setActiveTab(id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                    padding: '10px 12px', borderRadius: '10px',
                                                    border: 'none', cursor: 'pointer',
                                                    fontSize: '14px', fontWeight: 500,
                                                    textAlign: 'left', transition: 'all 0.15s',
                                                    background: active
                                                        ? 'linear-gradient(to right, #6B8E23, #556B2F)'
                                                        : 'transparent',
                                                    color: active ? '#ffffff' : textSec,
                                                    boxShadow: active ? '0 4px 14px rgba(107,142,35,0.35)' : 'none',
                                                }}
                                                onMouseEnter={e => {
                                                    if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverBg
                                                }}
                                                onMouseLeave={e => {
                                                    if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                                                }}
                                            >
                                                <Icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                                                {label}
                                            </button>
                                        )
                                    })}
                                </nav>
                            </div>

                            {/* ── Right content ── */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {/* Header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '20px 24px',
                                    borderBottom: `1px solid ${border}`,
                                    flexShrink: 0,
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: textPri }}>
                                        {activeTab === 'account' ? 'Account Settings' : 'Appearance'}
                                    </h3>
                                    <button
                                        onClick={onClose}
                                        style={{
                                            padding: '6px', borderRadius: '8px', border: 'none',
                                            background: 'transparent', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverBg}
                                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
                                    >
                                        <X style={{ width: '20px', height: '20px', color: textMut }} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: surface }}>

                                    {/* ── Account tab ── */}
                                    {activeTab === 'account' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                            <div>
                                                <p style={{ fontSize: '16px', fontWeight: 600, color: textPri, marginBottom: '16px' }}>
                                                    User Details
                                                </p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {[
                                                        { label: 'User ID',         value: user?.id },
                                                        { label: 'Email',           value: user?.email },
                                                        { label: 'Username',        value: user?.username ?? '—' },
                                                        { label: 'First Name',      value: user?.firstName ?? '—' },
                                                        { label: 'Last Name',       value: user?.lastName ?? '—' },
                                                        { label: 'Account Created', value: formatDate(user?.createdAt) },
                                                    ].map(({ label, value }) => (
                                                        <div key={label} style={{
                                                            backgroundColor: inputBg,
                                                            borderRadius: '12px', padding: '14px 16px',
                                                            border: `1px solid ${border}`,
                                                        }}>
                                                            <p style={{
                                                                fontSize: '11px', fontWeight: 500, color: textMut,
                                                                marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                            }}>
                                                                {label}
                                                            </p>
                                                            <p style={{ fontSize: '14px', fontWeight: 500, color: textPri, wordBreak: 'break-all' }}>
                                                                {value ?? '—'}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Danger zone */}
                                            <div>
                                                <p style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444', marginBottom: '16px' }}>
                                                    Danger Zone
                                                </p>
                                                <div style={{
                                                    backgroundColor: isDark ? 'rgba(220,38,38,0.08)' : '#fef2f2',
                                                    border: `1px solid ${isDark ? 'rgba(220,38,38,0.25)' : '#fecaca'}`,
                                                    borderRadius: '12px', padding: '20px',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                                        <div style={{
                                                            width: '40px', height: '40px', flexShrink: 0,
                                                            backgroundColor: isDark ? 'rgba(220,38,38,0.15)' : '#fee2e2',
                                                            borderRadius: '10px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        }}>
                                                            <AlertTriangle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{ fontSize: '15px', fontWeight: 600, color: textPri, marginBottom: '6px' }}>
                                                                Delete Account
                                                            </p>
                                                            <p style={{ fontSize: '13px', color: textMut, marginBottom: '16px', lineHeight: 1.6 }}>
                                                                Once you delete your account, there is no going back. This permanently deletes all your notes, tests, progress, and all associated data from the database.
                                                            </p>
                                                            <button
                                                                onClick={() => setShowDeleteConfirm(true)}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                                                                    backgroundColor: '#ef4444', color: '#ffffff',
                                                                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                                                }}
                                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#dc2626'}
                                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ef4444'}
                                                            >
                                                                <Trash2 style={{ width: '14px', height: '14px' }} />
                                                                Delete Account
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Appearance tab ── */}
                                    {activeTab === 'appearance' && (
                                        <div>
                                            <p style={{ fontSize: '16px', fontWeight: 600, color: textPri, marginBottom: '6px' }}>
                                                Theme Preference
                                            </p>
                                            <p style={{ fontSize: '13px', color: textMut, marginBottom: '24px' }}>
                                                Choose how SynapseFlow AI looks to you. Defaults to your system preference.
                                            </p>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                                <ThemeOption label="Light"  active={theme === 'light'}  isDark={isDark} onClick={() => setTheme('light')}
                                                    preview={
                                                        <div style={{ width: '100%', height: '96px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'linear-gradient(to right, #6B8E23, #556B2F)' }} />
                                                        </div>
                                                    }
                                                />
                                                <ThemeOption label="Dark"   active={theme === 'dark'}   isDark={isDark} onClick={() => setTheme('dark')}
                                                    preview={
                                                        <div style={{ width: '100%', height: '96px', backgroundColor: '#0f1117', borderRadius: '8px', border: '1px solid #2e3347', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'linear-gradient(to right, #6B8E23, #556B2F)' }} />
                                                        </div>
                                                    }
                                                />
                                                <ThemeOption label="System" active={theme === 'system'} isDark={isDark} onClick={() => setTheme('system')}
                                                    preview={
                                                        <div style={{ width: '100%', height: '96px', borderRadius: '8px', border: '1px solid #d1d5db', overflow: 'hidden', display: 'flex' }}>
                                                            <div style={{ flex: 1, backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(to right, #6B8E23, #556B2F)' }} />
                                                            </div>
                                                            <div style={{ flex: 1, backgroundColor: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(to right, #6B8E23, #556B2F)' }} />
                                                            </div>
                                                        </div>
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Delete confirmation modal ── */}
                    <AnimatePresence>
                        {showDeleteConfirm && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    onClick={() => setShowDeleteConfirm(false)}
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 300, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => setShowDeleteConfirm(false)}
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 301, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}
                                >
                                    <div
                                        onClick={e => e.stopPropagation()}
                                        style={{ width: '100%', maxWidth: '448px', backgroundColor: surface, borderRadius: '16px', boxShadow: shadow, padding: '24px' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                                            <div style={{ width: '48px', height: '48px', flexShrink: 0, backgroundColor: isDark ? 'rgba(220,38,38,0.15)' : '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <AlertTriangle style={{ width: '24px', height: '24px', color: '#ef4444' }} />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '18px', fontWeight: 700, color: textPri, marginBottom: '8px' }}>Confirm Account Deletion</p>
                                                <p style={{ fontSize: '13px', color: textMut, lineHeight: 1.6 }}>
                                                    This action is permanent and cannot be undone. All your data including notes, tests, progress, and associated information will be permanently deleted.
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '24px' }}>
                                            <p style={{ fontSize: '13px', fontWeight: 500, color: textSec, marginBottom: '8px' }}>
                                                Type{' '}
                                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>Delete-SynapseFlowAI-account</span>
                                                {' '}to confirm
                                            </p>
                                            <input
                                                type="text"
                                                value={deleteConfirmText}
                                                onChange={e => setDeleteConfirmText(e.target.value)}
                                                placeholder="Delete-SynapseFlowAI-account"
                                                style={{
                                                    width: '100%', padding: '10px 14px',
                                                    backgroundColor: inputBg, border: `1px solid ${border}`,
                                                    borderRadius: '8px', color: textPri, fontSize: '13px',
                                                    outline: 'none', boxSizing: 'border-box',
                                                }}
                                                onFocus={e => e.currentTarget.style.borderColor = '#ef4444'}
                                                onBlur={e => e.currentTarget.style.borderColor = border}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                                                style={{ flex: 1, padding: '10px', backgroundColor: hoverBg, border: `1px solid ${border}`, borderRadius: '10px', color: textPri, fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => { if (deleteConfirmText === 'Delete-SynapseFlowAI-account') deleteAccount() }}
                                                disabled={deleteConfirmText !== 'Delete-SynapseFlowAI-account' || deleting}
                                                style={{
                                                    flex: 1, padding: '10px', backgroundColor: '#ef4444',
                                                    border: 'none', borderRadius: '10px', color: '#ffffff',
                                                    fontSize: '14px', fontWeight: 600,
                                                    cursor: deleteConfirmText !== 'Delete-SynapseFlowAI-account' || deleting ? 'not-allowed' : 'pointer',
                                                    opacity: deleteConfirmText !== 'Delete-SynapseFlowAI-account' || deleting ? 0.5 : 1,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                }}
                                                onMouseEnter={e => { if (deleteConfirmText === 'Delete-SynapseFlowAI-account') (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#dc2626' }}
                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ef4444'}
                                            >
                                                <Trash2 style={{ width: '14px', height: '14px' }} />
                                                {deleting ? 'Deleting…' : 'Delete Account'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    )
}

// ── ThemeOption ───────────────────────────────────────────────────────────────

function ThemeOption({ label, active, isDark, onClick, preview }: {
    label: string; active: boolean; isDark: boolean; onClick: () => void; preview: React.ReactNode
}) {
    const border  = isDark ? '#2e3347' : '#e5e7eb'
    const textPri = isDark ? '#f9fafb' : '#111827'

    return (
        <button
            onClick={onClick}
            style={{
                padding: '14px', borderRadius: '12px', cursor: 'pointer',
                border: `2px solid ${active ? '#6B8E23' : border}`,
                backgroundColor: active
                    ? isDark ? 'rgba(107,142,35,0.1)' : 'rgba(107,142,35,0.05)'
                    : 'transparent',
                transition: 'all 0.15s', textAlign: 'center',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? '#4b5563' : '#9ca3af' }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = border }}
        >
            {preview}
            <p style={{ fontSize: '13px', fontWeight: 600, color: textPri, marginTop: '10px' }}>{label}</p>
            {active && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#6B8E23', margin: '6px auto 0' }} />}
        </button>
    )
}