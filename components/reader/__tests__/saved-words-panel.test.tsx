import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SavedWordsPanel } from "../saved-words-panel";
import { useWordList } from "@/lib/features/word-insight";
import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/features/word-insight", () => ({
  useWordList: vi.fn(),
}));

// Mock Radix UI Sheet to render content always for testing
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
  SheetDescription: ({ children }: any) => <div>{children}</div>,
}));

describe("SavedWordsPanel", () => {
  it("renders 'No words yet!' when list is empty", () => {
    (useWordList as any).mockReturnValue({
      words: [],
      isLoading: false,
      removeWord: vi.fn(),
    });

    render(<SavedWordsPanel isOpen={true} onOpenChange={() => {}} onWordClick={() => {}} />);
    expect(screen.getByText("No words yet!")).toBeDefined();
  });

  it("renders list of words when provided", () => {
    (useWordList as any).mockReturnValue({
      words: [
        { id: "1", word: "magic", definition: "Special powers" },
        { id: "2", word: "wonder", definition: "A feeling of surprise" },
      ],
      isLoading: false,
      removeWord: vi.fn(),
    });

    render(<SavedWordsPanel isOpen={true} onOpenChange={() => {}} onWordClick={() => {}} />);
    expect(screen.getByText("magic")).toBeDefined();
    expect(screen.getByText("wonder")).toBeDefined();
  });

  it("calls onWordClick when a word is clicked", () => {
    const onWordClick = vi.fn();
    (useWordList as any).mockReturnValue({
      words: [{ id: "1", word: "magic", definition: "Special powers" }],
      isLoading: false,
      removeWord: vi.fn(),
    });

    render(<SavedWordsPanel isOpen={true} onOpenChange={() => {}} onWordClick={onWordClick} />);
    fireEvent.click(screen.getByText("magic"));
    expect(onWordClick).toHaveBeenCalledWith("magic");
  });
});
