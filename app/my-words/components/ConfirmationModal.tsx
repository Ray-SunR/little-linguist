"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Info, Trash2 } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";

export type ConfirmationVariant = "danger" | "warning" | "info";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmationVariant;
    isLoading?: boolean;
}

const variants = {
    danger: {
        icon: Trash2,
        iconColor: "text-rose-500",
        iconBg: "bg-rose-100",
        confirmBtn: "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200",
        subtle: "bg-rose-50 text-rose-600",
    },
    warning: {
        icon: AlertTriangle,
        iconColor: "text-amber-500",
        iconBg: "bg-amber-100",
        confirmBtn: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200",
        subtle: "bg-amber-50 text-amber-600",
    },
    info: {
        icon: Info,
        iconColor: "text-blue-500",
        iconBg: "bg-blue-100",
        confirmBtn: "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-200",
        subtle: "bg-blue-50 text-blue-600",
    }
};

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger",
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const theme = variants[variant];
    const Icon = theme.icon;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 relative border-4 border-white"
                >
                    {/* Decorative Icon Blob */}
                    <div className={cn(
                        "w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center transform -rotate-6 shadow-sm",
                        theme.iconBg
                    )}>
                        <Icon className={cn("w-8 h-8", theme.iconColor)} />
                    </div>

                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-black font-fredoka text-slate-800 mb-2 leading-tight">
                            {title}
                        </h3>
                        <p className="text-slate-500 font-nunito font-semibold leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            disabled={isLoading}
                            className={cn(
                                "w-full py-4 rounded-xl font-black font-fredoka uppercase tracking-wider text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2",
                                theme.confirmBtn,
                                isLoading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isLoading && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                            {confirmLabel}
                        </button>
                        
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl font-bold font-fredoka text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-wider text-xs"
                        >
                            {cancelLabel}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
