/**
 * src/contexts/ThemeContext.tsx
 *
 * Provides light / dark / system theme switching.
 * - Persists the user's choice in localStorage under "theme".
 * - Applies / removes the "dark" class on <html> immediately.
 * - Defaults to "system" on first visit.
 */

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
    theme: Theme
    setTheme: (t: Theme) => void
    /** Resolved value — always either 'light' or 'dark' */
    resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// ── helpers ──────────────────────────────────────────────────────────────────

function getSystemPreference(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
    const resolved = theme === 'system' ? getSystemPreference() : theme
    if (resolved === 'dark') {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
    return resolved
}

// ── provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem('theme') as Theme | null) ?? 'system'
    })

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
        applyTheme((localStorage.getItem('theme') as Theme | null) ?? 'system')
    )

    // Apply whenever theme changes
    useEffect(() => {
        const resolved = applyTheme(theme)
        setResolvedTheme(resolved)
        localStorage.setItem('theme', theme)
    }, [theme])

    // Listen for OS-level changes when theme === 'system'
    useEffect(() => {
        if (theme !== 'system') return

        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => {
            const resolved = applyTheme('system')
            setResolvedTheme(resolved)
        }
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [theme])

    const setTheme = (t: Theme) => setThemeState(t)

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
    return ctx
}