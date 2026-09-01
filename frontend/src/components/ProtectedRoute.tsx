import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { data: user, isLoading, error } = useCurrentUser();

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if unauthorized (401) or user data not available
    if (error || !user) {
        return <Navigate to="/login" replace />;
    }

    // User is authenticated, render protected content
    return <>{children}</>;
}
