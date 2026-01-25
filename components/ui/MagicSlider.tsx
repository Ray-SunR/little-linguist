import React from 'react';
import { cn } from '@/lib/core';
import { BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface MagicSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (val: number) => void;
    color: 'indigo' | 'amber';
    statusLabel?: string;
}

const MagicSlider: React.FC<MagicSliderProps> = ({
    label,
    value,
    min,
    max,
    onChange,
    color,
    statusLabel
}) => {
    const isIndigo = color === 'indigo';
    const Icon = isIndigo ? BookOpen : Sparkles;
    
    // Calculate percentage for gradient track
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-3"
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <motion.div 
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        className={cn(
                        "p-1.5 rounded-lg shadow-sm",
                        isIndigo ? "bg-indigo-50 text-indigo-500" : "bg-amber-50 text-amber-500"
                    )}>
                        <Icon size={18} strokeWidth={2.5} />
                    </motion.div>
                    <span className="text-[13px] font-black text-slate-700 uppercase tracking-wider">{label}</span>
                </div>
                {statusLabel && (
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm border border-white/50",
                        isIndigo ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
                    )}>
                        {statusLabel}
                    </motion.div>
                )}
            </div>
            
            <div className="relative h-6 flex items-center">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    role="slider"
                    aria-label={label}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className={cn(
                        "magic-slider-input w-full h-3 rounded-full appearance-none cursor-pointer shadow-clay-inset bg-slate-100 transition-all",
                    )}
                    style={{
                        background: isIndigo 
                            ? `linear-gradient(to right, #6366f1 ${percentage}%, #f1f5f9 ${percentage}%)`
                            : `linear-gradient(to right, #f59e0b ${percentage}%, #f1f5f9 ${percentage}%)`
                    }}
                />
                <style jsx>{`
                    .magic-slider-input::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 24px;
                        height: 24px;
                        background: white;
                        border-radius: 50%;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                        border: 2px solid ${isIndigo ? '#6366f1' : '#f59e0b'};
                        cursor: pointer;
                        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    .magic-slider-input::-webkit-slider-thumb:hover {
                        transform: scale(1.15);
                        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                    }
                    .magic-slider-input::-webkit-slider-thumb:active {
                        transform: scale(0.95);
                    }
                    .magic-slider-input::-moz-range-thumb {
                        width: 24px;
                        height: 24px;
                        background: white;
                        border-radius: 50%;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                        border: 2px solid ${isIndigo ? '#6366f1' : '#f59e0b'};
                        cursor: pointer;
                        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    .magic-slider-input::-moz-range-thumb:hover {
                        transform: scale(1.15);
                    }
                `}</style>
            </div>
        </motion.div>
    );
};

export default MagicSlider;
