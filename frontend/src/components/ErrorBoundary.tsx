import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
    children: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // It keeps the failure visible in the console instead of silently vanishing behind a blank screen.
        console.error('Uncaught render error:', error, errorInfo)
    }

    handleReload = () => {
        window.location.href = '/dashboard'
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen flex items-center justify-center bg-white">
                    <div className="text-center max-w-md px-6">
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
                        <p className="text-gray-500 mb-6">
                            An unexpected error occurred. Try reloading. If it keeps happening, let us know what you were doing when it broke.
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="inline-block px-6 py-2 bg-[#6B8E23] hover:bg-[#556B2F] text-white font-semibold rounded-lg shadow-md transition-all duration-200"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}