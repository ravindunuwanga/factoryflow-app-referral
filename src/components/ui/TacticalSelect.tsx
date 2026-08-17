"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface TacticalSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function TacticalSelect({ options, value, onChange, placeholder = "Select...", className }: TacticalSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative z-30", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white flex items-center justify-between hover:bg-white/[0.08] hover:border-white/20 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50 group"
      >
        <span className={cn("truncate font-bold tracking-tight uppercase italic", !selectedOption && "text-neutral-500 italic font-medium")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={cn("text-neutral-500 transition-transform duration-300 group-hover:text-white", isOpen && "rotate-180")} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
          >
            <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-xs font-black uppercase tracking-widest text-left rounded-xl transition-all flex items-center justify-between group",
                    value === option.value 
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" 
                      : "text-neutral-500 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="truncate italic">{option.label}</span>
                  {value === option.value && <Check size={14} className="text-blue-500" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
