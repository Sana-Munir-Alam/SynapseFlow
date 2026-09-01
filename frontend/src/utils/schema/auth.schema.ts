import { z } from "zod";

export const loginSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string()
        .min(6, "Password must be at least 6 characters")
        .max(50, "Password must be less than 50 characters"),
})

export type LoginFormData = z.infer<typeof loginSchema>;


export const signupSchema = z.object({
    firstName: z.string()
        .min(1, "First name is required")
        .max(50, "First name must be less than 50 characters"),
    lastName: z.string()
        .min(1, "Last name is required")
        .max(50, "Last name must be less than 50 characters"),
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(20, "Username must be less than 20 characters"),
    email: z.email("Please enter a valid email address"),
    password: z.string()
        .min(6, "Password must be at least 6 characters")
        .max(50, "Password must be less than 50 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export type SignupFormData = z.infer<typeof signupSchema>;


export const forgotPasswordSchema = z.object({
    email: z.email("Please enter a valid email address")
})

export type forgotPasswordData = z.infer<typeof forgotPasswordSchema>


export const changePasswordSchema = z.object({
    password: z.string()
        .min(6, "Password must be at least 6 characters")
        .max(50, "Password must be less than 50 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export type changePasswordData = z.infer<typeof changePasswordSchema>

