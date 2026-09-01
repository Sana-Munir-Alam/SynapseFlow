import { api } from "../lib/axios";
import { useQuery } from "@tanstack/react-query";

const getCurrentUser = async () => {
    const res = await api.get('/auth/me')
    return res.data
}

export const useCurrentUser = () => {
    return useQuery({
        queryKey: ["current_user"],
        queryFn: getCurrentUser,
        staleTime: 1 * 60 * 1000,        // 1 minute - shorter than global since auth status matters
        gcTime: 10 * 60 * 1000,          // 10 minutes - keep longer (important user data)
        retry: (failureCount, error: any) => {
            if (error?.response?.status === 401) return false
            return failureCount < 2  // Retry other errors up to 2 times
        },
    })
}