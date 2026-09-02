import axios from 'axios'

export const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
})

let isRefreshing = false
let refreshSubscribers: Array<(success: boolean) => void> = []

function onRefreshed(success: boolean) {
    refreshSubscribers.forEach((cb) => cb(success))
    refreshSubscribers = []
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        const isAuthEndpoint =
            originalRequest?.url?.includes('/auth/login') ||
            originalRequest?.url?.includes('/auth/refresh') ||
            originalRequest?.url?.includes('/auth/register')

        // Only retry once, and never for the auth endpoints themselves —
        // otherwise a genuinely expired refresh token loops forever.
        if (error.response?.status !== 401 || isAuthEndpoint || originalRequest?._retry) {
            return Promise.reject(error)
        }

        originalRequest._retry = true

        if (isRefreshing) {
            // A refresh is already in flight (e.g. two requests 401'd at once) —
            // queue this one instead of firing a second refresh call.
            return new Promise((resolve, reject) => {
                refreshSubscribers.push((success) => {
                    if (success) resolve(api(originalRequest))
                    else reject(error)
                })
            })
        }

        isRefreshing = true

        try {
            await api.post('/auth/refresh')
            isRefreshing = false
            onRefreshed(true)
            return api(originalRequest)
        } catch (refreshError) {
            isRefreshing = false
            onRefreshed(false)
            window.location.href = '/login'
            return Promise.reject(error)
        }
    }
)