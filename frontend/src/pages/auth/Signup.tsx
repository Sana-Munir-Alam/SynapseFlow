import { Lock, Mail, User } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import type { FieldErrors, SubmitHandler, UseFormHandleSubmit, UseFormRegister } from "react-hook-form";
import { useSignup } from "@/hooks/useAuth";
import type { SignupFormData } from "@/utils/schema/auth.schema";
import { Logo } from "@/components/ui/logo";
import { type ReactNode } from "react";

export default function SignupPage() {
    const { mutate: signup, isPending, apiError, register, handleSubmit, errors } = useSignup()

    return (
        <div className="h-screen w-screen flex bg-[var(--bg-page)] overflow-hidden font-sans">
            
            {/* Left Graphic - Sophisticated Minimalist Olive Theme */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#0B0B0B] relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-20">
                    {/* Green glow instead of indigo */}
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6B8E23] blur-[140px] opacity-40" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#556B2F] blur-[120px] opacity-30" />
                </div>
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBoNDBWMEgwem0yMCAwdjIwaDIwdjIweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDEwNywxNDIsMzUsMC4wNykiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybi48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMS0wJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40 z-0"></div>
                
                <div className="relative z-10 p-16 max-w-xl">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <h2 className="text-5xl font-extralight tracking-tight text-white mb-8 leading-tight">
                            Elevate your <br />
                            <span className="font-normal text-[#A9BA9D]">academic journey.</span>
                        </h2>
                        <p className="text-gray-400 text-lg font-light leading-relaxed max-w-md">
                            A minimalist environment crafted for focus, clarity, and collaborative growth.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Right Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[var(--bg-surface)] relative z-10 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.03)] border-l border-[var(--border)]">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-md max-h-screen overflow-y-auto py-4 no-scrollbar px-1"
                >
                    <div className="mb-10">
                        <Logo />
                        <h2 className="text-3xl font-medium text-[var(--text-primary)] tracking-tight mt-10 mb-2">
                            Create an account
                        </h2>
                        <p className="text-[var(--text-muted)] text-[15px] font-light">
                            Join SynapseFlow and start learning smarter today.
                        </p>
                    </div>
                    
                    <Form
                        register={register}
                        handleSubmit={handleSubmit}
                        onSubmit={(data: SignupFormData) => signup(data)}
                        errors={errors}
                        isPending={isPending}
                        apiError={apiError}
                    />

                    <div className="mt-10 text-center">
                        <p className="text-[var(--text-muted)] text-sm font-light">
                            Already have an account?{" "}
                            <Link to="/login" className="text-[#6B8E23] font-medium hover:text-[#556B2F] transition-colors duration-200 ml-1">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// Localized Input Component
const AuthInput = ({ 
    label, icon, error, ...props 
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string, icon?: ReactNode, error?: string }) => (
    <div className="w-full group">
        <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2 transition-colors group-focus-within:text-[#6B8E23]">
            {label}
        </label>
        <div className="relative">
            {icon && (
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-faint)] group-focus-within:text-[#6B8E23] transition-colors">
                    {icon}
                </div>
            )}
            <input
                {...props}
                className={`
                    block w-full rounded-xl border ${error ? 'border-red-300' : 'border-[var(--border)]'} 
                    bg-[var(--bg-subtle)] px-4 py-3 ${icon ? 'pl-11' : ''} text-[var(--text-primary)] placeholder-[var(--text-faint)]
                    focus:outline-none focus:ring-2 focus:ring-[#6B8E23]/20 focus:border-[#6B8E23] focus:bg-[var(--bg-surface)]
                    transition-all duration-200 text-[15px]
                `}
            />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{error}</p>}
    </div>
);

// Localized Button Component
const AuthButton = ({ children, isPending, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isPending?: boolean }) => (
    <button
        {...props}
        disabled={isPending || props.disabled}
        className="cursor-pointer w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#6B8E23] hover:bg-[#556B2F] focus:outline-none focus:ring-4 focus:ring-[#6B8E23]/20 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-4 active:scale-[0.98]"
    >
        {isPending ? (
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Account...</span>
            </div>
        ) : children}
    </button>
);

const Form = ({
    register,
    handleSubmit,
    onSubmit,
    errors,
    isPending,
    apiError
}: {
    register: UseFormRegister<SignupFormData>;
    handleSubmit: UseFormHandleSubmit<SignupFormData>;
    onSubmit: SubmitHandler<SignupFormData>;
    errors: FieldErrors<SignupFormData>;
    isPending?: boolean;
    apiError?: string | null;
}) => {
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* API Error Display */}
            {apiError && (
                <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                    {apiError || 'Signup failed. Please try again.'}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <AuthInput
                    label="First Name"
                    placeholder="John"
                    {...register('firstName')}
                    icon={<User className="w-4 h-4" />}
                    error={errors.firstName?.message}
                    required
                />

                <AuthInput
                    label="Last Name"
                    placeholder="Doe"
                    {...register('lastName')}
                    icon={<User className="w-4 h-4" />}
                    error={errors.lastName?.message}
                    required
                />
            </div>

            <div className="space-y-5">
                <AuthInput
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    {...register('email')}
                    icon={<Mail className="w-4 h-4" />}
                    error={errors.email?.message}
                    required
                />
                
                <AuthInput
                    label="Username"
                    placeholder="johndoe"
                    {...register('username')}
                    icon={<User className="w-4 h-4" />}
                    error={errors.username?.message}
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <AuthInput
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                    icon={<Lock className="w-4 h-4" />}
                    error={errors.password?.message}
                    required
                />

                <AuthInput
                    label="Confirm Password"
                    type="password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    icon={<Lock className="w-4 h-4" />}
                    error={errors.confirmPassword?.message}
                    required
                />
            </div>

            <div className="flex items-start gap-3 pt-2">
                <div className="flex items-center h-5">
                    <input 
                        type="checkbox" 
                        required 
                        className="w-4 h-4 text-[#6B8E23] bg-[var(--bg-subtle)] border-[var(--border)] rounded focus:ring-[#6B8E23] transition-all cursor-pointer"
                    />
                </div>
                <div className="text-sm">
                    <span className="text-[var(--text-muted)] font-light">
                        I agree to the <a href="#" className="font-medium text-[#6B8E23] hover:underline decoration-[#6B8E23]/30">Terms</a> and <a href="#" className="font-medium text-[#6B8E23] hover:underline decoration-[#6B8E23]/30">Privacy Policy</a>
                    </span>
                </div>
            </div>

            <AuthButton type="submit" isPending={isPending}>
                Create Account
            </AuthButton>
        </form>
    )
}
