import React from 'react'
import { motion } from 'motion/react'

export function TabPanel({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
        >
            {children}
        </motion.div>
    )
}

export function EmptyState({
    icon,
    message,
    hint,
}: {
    icon:    React.ReactNode
    message: string
    hint:    string
}) {
    return (
        <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                {icon}
            </div>
            <p className="font-semibold text-gray-700 mb-1">{message}</p>
            <p className="text-sm text-gray-400">{hint}</p>
        </div>
    )
}
