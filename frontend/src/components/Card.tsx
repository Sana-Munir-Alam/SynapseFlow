import type { ReactNode } from "react";
import { motion } from "motion/react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  gradient?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false, gradient = false }: CardProps) {
  const baseClasses = "bg-white rounded-2xl shadow-sm border border-gray-100 p-6";
  const hoverClasses = hoverable ? "cursor-pointer hover:shadow-lg transition-all" : "";
  const gradientClasses = gradient ? "bg-gradient-to-br from-white to-purple-50" : "";
  return (
    <motion.div
      whileHover={hoverable ? { y: -4 } : {}}
      onClick={onClick}
      className={`${baseClasses} ${hoverClasses} ${gradientClasses} ${className}`}
    >
      {children}
    </motion.div>
  );
}
