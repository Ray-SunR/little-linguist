import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/core";
import { clayVariants } from "@/lib/clay-utils";
import { ChevronDown, X, type LucideIcon } from "lucide-react";

interface Option {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface ClaySelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  options: Option[];
  placeholder?: string;
  icon?: LucideIcon;
  iconClass?: string;
  className?: string;
  variant?: "white" | "purple" | "blue" | "green" | "orange" | "glass";
}

export function ClaySelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  icon: Icon,
  iconClass,
  className,
  variant = "white"
}: ClaySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className={cn("relative transition-all duration-200", isOpen ? "z-50" : "z-20", className)} ref={containerRef}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          clayVariants({ color: variant, intensity: "medium", shape: "pill" }),
          "flex items-center gap-2 pl-4 pr-6 py-2 min-h-[64px] h-16 min-w-[160px] border-4 border-white/50"
        )}
      >
        {Icon && (
          <div className={cn("relative flex-shrink-0 mr-2 transition-colors", iconClass ? iconClass : "text-slate-400 group-hover:text-purple-500")}>
            <Icon className="w-6 h-6 stroke-[2.5px]" />
          </div>
        )}
        
        <div className="flex flex-col items-start flex-1 mr-2 text-left">
          {selectedOption ? (
            <span className="text-sm font-bold font-fredoka text-slate-700 leading-tight">
              {selectedOption.label}
            </span>
          ) : (
             <span className="text-sm font-medium font-fredoka text-slate-500 leading-tight">
              {placeholder}
            </span>
          )}
        </div>

        {value ? (
           <div
            role="button"
            className="p-1 hover:bg-black/5 rounded-full"
            onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
            }}
           >
             <X className="w-3 h-3 text-slate-400" />
           </div>
        ) : (
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
                "absolute top-full left-0 mt-2 w-full min-w-[200px]",
                "bg-white/90 backdrop-blur-xl border border-white/40",
                "rounded-2xl shadow-xl overflow-hidden p-2 ring-1 ring-black/5"
            )}
          >
            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm font-bold font-fredoka transition-colors",
                    value === option.value
                      ? "bg-purple-100 text-purple-700"
                      : "hover:bg-slate-100 text-slate-600"
                  )}
                >
                  {option.icon && <span className="text-lg"><option.icon className="w-4 h-4" /></span>}
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
