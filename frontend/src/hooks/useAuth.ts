import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/axios'
import { changePasswordSchema, forgotPasswordSchema, signupSchema, type changePasswordData, type forgotPasswordData, type SignupFormData } from '../utils/schema/auth.schema'
import { loginSchema, type LoginFormData } from '../utils/schema/auth.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { AxiosError } from 'axios'
import { toast } from 'sonner'

// ---- Types ----------------------------------------------------------------

interface SignupResponse {
    message: string
    user: {
        id: string
        email: string
        firstName?: string
        lastName?: string
        username?: string
    }
}

interface ApiErrorResponse {
    message: string
}

// ---- API calls ------------------------------------------------------------

const createUser = async (formData: SignupFormData): Promise<SignupResponse> => {
    const res = await api.post<SignupResponse>('/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
    })
    return res.data
}

const loginUser = async (formData: LoginFormData) => {
    const res = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
    })
    return res.data
}

// ---- Hooks ----------------------------------------------------------------

export function useSignup() {
    const navigate = useNavigate()

    const { register, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
        mode: 'onBlur',
        resolver: zodResolver(signupSchema),
    })

    const { error, isPending, mutate } = useMutation<
        SignupResponse,
        AxiosError<ApiErrorResponse>,
        SignupFormData
    >({
        mutationFn: createUser,
        onSuccess: (data) => {
            toast.success("Registration successful!")
            console.log('User registered successfully:', data)
            navigate('/dashboard')
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message ?? error.message ?? "Registration failed. Please try again."
            console.error('Signup error:', errorMessage)
            toast.error(errorMessage)
        },
    })

    const apiError = error?.response?.data?.message ?? error?.message ?? null

    return { apiError, isPending, mutate, register, handleSubmit, errors }
}

export function useLogin() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        mode: 'onBlur',
        resolver: zodResolver(loginSchema),
    })

    const { error, isPending, mutate } = useMutation<
        SignupResponse,
        AxiosError<ApiErrorResponse>,
        LoginFormData
    >({
        mutationFn: loginUser,
        onSuccess: (data) => {
            queryClient.clear()

            toast.success("Login successful!")
            console.log('User logged in successfully:', data)
            navigate('/dashboard')
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message ?? error.message ?? "Login failed. Please try again."
            console.error('Login error:', errorMessage)
            toast.error(errorMessage)
        },
    })

    const apiError = error?.response?.data?.message ?? error?.message ?? null

    return { apiError, isPending, mutate, register, handleSubmit, errors }
}

const sendEmail = async ({ email }: forgotPasswordData) => {
    const res = await api.post('/auth/forgot-password', {
        email
    })

    return res.data
}

export function useForgotPassword() {
    const queryClient = useQueryClient()
    const { register, handleSubmit, formState: { errors } } = useForm<forgotPasswordData>({
        mode: 'onBlur',
        resolver: zodResolver(forgotPasswordSchema)
    })

    const { mutate, error, isPending } = useMutation<
        string,
        AxiosError<ApiErrorResponse>,
        forgotPasswordData
    >({
        mutationFn: sendEmail,
        onSuccess: (data) => {
            queryClient.clear()

            toast.success("Email sent successfully!")
            console.log('Email sent successfully: ', data)
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message ?? error.message ?? "Failed to send email. Please try again."
            console.error('Email error:', errorMessage)
            toast.error(errorMessage)
        },
    })

    const apiError = error?.response?.data?.message ?? error?.message ?? null

    return { apiError, isPending, mutate, register, handleSubmit, errors }
}

const changePassFn = async ({ password, token }: { password: string; token: string }) => {
    const res = await api.post('/auth/reset-password', {
        password,
        token,
    })

    return res.data
}

export function useChangePassword(token: string) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { register, handleSubmit, formState: { errors } } = useForm<changePasswordData>({
        mode: 'onBlur',
        resolver: zodResolver(changePasswordSchema),
    })

    const { mutate, error, isPending } = useMutation<
        string,
        AxiosError<ApiErrorResponse>,
        changePasswordData
    >({
        mutationFn: (data) => {
            if (!token) {
                throw new Error('Missing reset token')
            }

            return changePassFn({ password: data.password, token })
        },
        onSuccess: (data) => {
            queryClient.clear()

            toast.success('Password updated successfully!')
            console.log('Password reset successfully:', data)
            navigate('/login')
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message ?? error.message ?? 'Failed to update password. Please try again.'
            console.error('Password reset error:', errorMessage)
            toast.error(errorMessage)
        },
    })

    const apiError = error?.response?.data?.message ?? error?.message ?? null

    return { apiError, isPending, mutate, register, handleSubmit, errors }
}

export function useLogout() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            await api.post('/auth/logout')
        },
        onSuccess: () => {
            queryClient.clear() // clear all cached queries on logout
            toast.success("Logged out successfully!")
            navigate('/')
        },
        onError: (error) => {
            const errorMessage = error instanceof Error
                ? error.message
                : "Logout failed. Please try again."
            console.error('Logout error:', errorMessage)
            toast.error(errorMessage)
        },
    })
}