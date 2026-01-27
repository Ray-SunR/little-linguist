"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useWordList } from "@/lib/features/word-insight";
import { BookMarked, BookOpen, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/core";

interface SavedWordsPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onWordClick: (word: string) => void;
}

export function SavedWordsPanel({ isOpen, onOpenChange, onWordClick }: SavedWordsPanelProps) {
  const { words, removeWord, isLoading } = useWordList();

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 border-l-4 border-purple-100 bg-white/95 backdrop-blur-xl z-[300] flex flex-col"
      >
        <SheetHeader className="p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <BookMarked className="h-6 w-6 fill-white" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-2xl font-fredoka font-black text-white">My Magic Words</SheetTitle>
              <SheetDescription className="text-purple-100 font-nunito font-bold">
                Your collection of discovered treasures
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full"
              />
              <p className="font-fredoka font-bold text-ink-muted">Summoning words...</p>
            </div>
          ) : words.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-8">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                <BookOpen className="h-10 w-10 text-slate-300" />
              </div>
              <p className="font-fredoka font-bold text-ink text-lg">No words yet!</p>
              <p className="font-nunito font-medium text-ink-muted mt-2">
                Click on words in the story to save them to your magical collection.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {words.map((item: any) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer"
                    onClick={() => onWordClick(item.word)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-fredoka font-black text-purple-600 capitalize">
                        {item.word}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWord(item.word, item.bookId);
                        }}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm font-nunito font-bold text-ink-muted line-clamp-2 italic">
                      {item.definition || "Loading definition..."}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
