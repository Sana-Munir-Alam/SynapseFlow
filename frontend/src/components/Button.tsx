import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface ButtonProps {
    children: ReactNode
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    fullWidth?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    icon?: ReactNode
    className?: string
}

export function Button({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    type = 'button',
    icon,
    className = '',
}: ButtonProps) {

    // ── size ──────────────────────────────────────────────────────────────────
    const sizeStyle: React.CSSProperties =
        size === 'sm'
            ? { padding: '8px 16px', fontSize: '14px' }
            : size === 'lg'
            ? { padding: '16px 32px', fontSize: '18px' }
            : { padding: '12px 24px', fontSize: '15px' }

    // ── variant ───────────────────────────────────────────────────────────────
    const variantStyle: React.CSSProperties = (() => {
        switch (variant) {
            case 'primary':
                return {
                    background: 'linear-gradient(to right, #6B8E23, #556B2F)',
                    color: '#ffffff',
                    border: '2px solid transparent',
                }
            case 'secondary':
                return {
                    background: 'linear-gradient(to right, #A9BA9D, #6B8E23)',
                    color: '#ffffff',
                    border: '2px solid transparent',
                }
            case 'outline':
                return {
                    background: '#ffffff',
                    color: '#6B8E23',
                    border: '2px solid #6B8E23',
                }
            case 'ghost':
                return {
                    background: 'transparent',
                    color: '#374151',
                    border: '2px solid transparent',
                }
            case 'danger':
                return {
                    background: '#ef4444',
                    color: '#ffffff',
                    border: '2px solid transparent',
                }
        }
    })()

    return (
        <motion.button
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={className}
            style={{
                // Layout
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.15s ease',
                width: fullWidth ? '100%' : undefined,
                fontFamily: 'inherit',
                lineHeight: 1.25,
                // variant-specific overrides applied last
                ...sizeStyle,
                ...variantStyle,
            }}
            // Hover: darken / invert outline
            onMouseEnter={(e) => {
                if (disabled) return
                const btn = e.currentTarget as HTMLButtonElement
                if (variant === 'outline') {
                    btn.style.background = 'linear-gradient(to right, #6B8E23, #556B2F)'
                    btn.style.color = '#ffffff'
                } else if (variant === 'primary') {
                    btn.style.boxShadow = '0 4px 16px rgba(107,142,35,0.45)'
                } else if (variant === 'secondary') {
                    btn.style.boxShadow = '0 4px 16px rgba(169,186,157,0.45)'
                } else if (variant === 'ghost') {
                    btn.style.backgroundColor = '#f3f4f6'
                } else if (variant === 'danger') {
                    btn.style.backgroundColor = '#dc2626'
                }
            }}
            onMouseLeave={(e) => {
                if (disabled) return
                const btn = e.currentTarget as HTMLButtonElement
                btn.style.boxShadow = 'none'
                if (variant === 'outline') {
                    btn.style.background = '#ffffff'
                    btn.style.color = '#6B8E23'
                } else if (variant === 'ghost') {
                    btn.style.backgroundColor = 'transparent'
                } else if (variant === 'danger') {
                    btn.style.backgroundColor = '#ef4444'
                }
            }}
        >
            {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
            {children}
        </motion.button>
    )
}