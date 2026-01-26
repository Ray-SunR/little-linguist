import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/core";
import { COLLECTIONS, COLLECTION_THEMES } from "./toolbar-constants";

interface CollectionTabsProps {
    activeCollection: string;
    onCollectionChange: (id: string) => void;
    currentUserId?: string | null;
}

export function CollectionTabs({
    activeCollection,
    onCollectionChange,
    currentUserId
}: CollectionTabsProps) {
    const visibleCollections = currentUserId
        ? COLLECTIONS
        : COLLECTIONS.filter(c => c.id === 'discovery');

    return (
        <div className="flex items-center gap-0.5 md:gap-1 pl-1 md:pl-0">
            {visibleCollections.map((col) => {
                const Icon = col.icon;
                const isActive = activeCollection === col.id;
                const activeTheme = COLLECTION_THEMES[col.id as keyof typeof COLLECTION_THEMES];
                const isMultipleTabs = visibleCollections.length > 1;

                return (
                    <button
                        key={col.id}
                        onClick={() => onCollectionChange(col.id)}
                        className={cn(
                            "relative flex items-center justify-center font-fredoka font-bold text-sm transition-all duration-300 py-2 rounded-full",
                            isActive
                                ? `${activeTheme} text-white shadow-lg shadow-purple-200/50 scale-105 z-10 px-3 md:px-4`
                                : "text-purple-400 bg-purple-50/30 hover:text-purple-600 hover:bg-purple-50/50 px-2 md:px-3",
                            !isMultipleTabs && "px-4"
                        )}
                        title={col.label}
                    >
                        <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform", isActive && "scale-110")} />

                        <AnimatePresence initial={false}>
                            {(isActive || !isMultipleTabs) && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                    animate={{ width: "auto", opacity: 1, marginLeft: 8 }}
                                    exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    className="hidden lg:inline overflow-hidden whitespace-nowrap text-xs md:text-sm"
                                >
                                    {col.label}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                );
            })}
        </div>
    );
}
