"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Book = {
  id: string;
  title: string;
};

type BookSelectProps = {
  books: Book[];
  selectedBookId: string;
  onSelect: (id: string) => void;
  label?: string;
};

export default function BookSelect({
  books,
  selectedBookId,
  onSelect,
  label = "Choose a book",
}: BookSelectProps) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const selected = books.find((book) => book.id === selectedBookId);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!listRef.current) return;
      if (!listRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={listRef}>
      {label && (
        <label className="text-sm font-semibold text-ink" id="book-select-label">
          {label}
        </label>
      )}
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-2 text-left transition-colors hover:bg-accent-soft/30 rounded-lg px-2 py-1 -ml-2 ${label ? 'pill-input touch-target mt-2 text-base' : 'text-xl font-bold section-title sm:text-2xl'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? "book-select-label" : undefined}
        onClick={handleToggle}
      >
        <span className="truncate">{selected?.title ?? "Select a book"}</span>
        <ChevronDown className={`flex-shrink-0 ${label ? 'h-4 w-4 text-ink-muted' : 'h-5 w-5 text-accent'}`} aria-hidden />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-labelledby="book-select-label"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-soft"
        >
          <div className="max-h-64 overflow-y-auto">
            {books.map((book) => {
              const isActive = book.id === selectedBookId;
              return (
                <button
                  key={book.id}
                  role="option"
                  aria-selected={isActive}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-base ${
                    isActive
                      ? "bg-accent-soft font-semibold text-ink"
                      : "hover:bg-shell text-ink"
                  }`}
                  onClick={() => handleSelect(book.id)}
                >
                  <span className="truncate">{book.title}</span>
                  {isActive ? <span className="text-sm text-accent">●</span> : null}
                </button>
              );
            })}
            {books.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ink-muted">No books available</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
