"use client";

import { usePathname } from "next/navigation";
import { WordListProvider } from "@/lib/features/word-insight";

const WORD_ROUTES = ["/my-words", "/story-maker", "/reader"];

export function WordListGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldProvide = pathname ? WORD_ROUTES.some((r) => pathname.startsWith(r)) : false;

  return (
    <WordListProvider fetchOnMount={shouldProvide}>
      {children}
    </WordListProvider>
  );
}
