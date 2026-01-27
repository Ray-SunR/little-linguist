import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SupabaseReaderShell from "../supabase-reader-shell";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-narration-engine", () => ({
  useNarrationEngine: vi.fn(() => ({
    state: "paused",
    play: vi.fn(),
    pause: vi.fn(),
    seekToWord: vi.fn(),
    setSpeed: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-reader-persistence", () => ({
  useReaderPersistence: vi.fn(() => ({
    saveProgress: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock("@/hooks/use-word-inspector", () => ({
  useWordInspector: vi.fn(() => ({
    openWord: vi.fn(),
    close: vi.fn(),
    selectedWordIndex: null,
    insight: null,
    isLoading: false,
    error: null,
    isOpen: false,
    position: null,
    retry: vi.fn(),
  })),
}));

vi.mock("@/lib/features/word-insight", () => ({
  useWordList: vi.fn(() => ({
    words: [],
    isLoading: false,
    removeWord: vi.fn(),
  })),
}));

vi.mock("@/components/tutorial/tutorial-context", () => ({
  useTutorial: vi.fn(() => ({
    completeStep: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-wake-lock", () => ({
  useWakeLock: vi.fn(() => ({
    request: vi.fn(),
    release: vi.fn(),
  })),
}));

// Mock heavy/context-dependent components
vi.mock("@/components/ui/lumo-character", () => ({
  LumoCharacter: () => <div data-testid="lumo-mock">Lumo</div>,
}));

vi.mock("../word-inspector-tooltip", () => ({
  default: () => <div data-testid="inspector-mock">Inspector</div>,
}));

vi.mock("../saved-words-panel", () => ({
  SavedWordsPanel: ({ isOpen }: any) => isOpen ? <div data-testid="saved-words-panel-mock">Saved Words Panel</div> : null,
}));

vi.mock("../book-layout", () => ({
  default: () => <div data-testid="book-layout-mock">Book Layout</div>,
}));

describe("SupabaseReaderShell Integration", () => {
  const mockBooks: any[] = [
    { id: "1", title: "Test Book", tokens: [], shards: [] }
  ];

  it("renders the BookMarked button and opens SavedWordsPanel", () => {
    render(<SupabaseReaderShell books={mockBooks} initialBookId="1" childId="child-1" />);
    
    const vocabBtn = screen.getByLabelText("View saved words");
    expect(vocabBtn).toBeDefined();
    
    fireEvent.click(vocabBtn);
    
    expect(screen.getByTestId("saved-words-panel-mock")).toBeDefined();
    expect(screen.getByText("Saved Words Panel")).toBeDefined();
  });
});
