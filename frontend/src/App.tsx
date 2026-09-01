import { createBrowserRouter, RouterProvider, Navigate, Link } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import Signup from './pages/auth/Signup'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ChangePassword from './pages/auth/ChangePassword'
import Dashboard from './pages/Dashboard'
import SchedulerPage from './pages/Scheduler'
import NotesTestPage from './pages/NotesTest'
import CourseDetailPage from './pages/CourseDetail'
import ProgressPage from './pages/Progress'
import { ChatPage } from './pages/ChatPage'

const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-gray-200 mb-4 px-20">404 - Page Not Found</h2>
      <p className="text-gray-400 mb-6">The page you are looking for doesn't exist or is under construction.</p>
      <Link
        to="/dashboard"
        className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  </div>
)

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/verify-email',
    element: <ChangePassword />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'scheduler', element: <SchedulerPage /> },
      { path: 'notes', element: <NotesTestPage /> },
      { path: 'notes/:courseId', element: <CourseDetailPage /> },
      { path: 'group-chat', element: <ChatPage /> },
      { path: '*', element: <NotFoundPage /> },
      { path: 'progress', element: <ProgressPage /> }
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

const App = () => {
  return <RouterProvider router={router} />
}

export default App