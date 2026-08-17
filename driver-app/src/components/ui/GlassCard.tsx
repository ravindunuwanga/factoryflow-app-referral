"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export default function GlassCard({ children, className, animate = true }: GlassCardProps) {
  const Component = animate ? motion.div : "div";

  return (
    <Component
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] backdrop-blur-xl rounded-2xl p-6",
        className
      )}
    >
      {children}
    </Component>
  );
}
