import Link from "next/link";
import { BookOpen, Sparkles, Wand2 } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen page-story-maker flex flex-col items-center justify-center px-6 py-10">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 shadow-lg mb-6">
          <span className="text-4xl">📚</span>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm text-sm font-bold text-accent mb-4">
          <Sparkles className="h-4 w-4" />
          Friendly Read-Aloud
        </div>
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
          Story Time
        </h1>
        <p className="max-w-md mx-auto text-lg text-ink-muted">
          Cozy, kid-first reading with highlighted words and calm controls.
        </p>
      </div>

      {/* Main Card */}
      <div className="glass-card w-full max-w-md p-8">
        <p className="text-center text-ink-muted font-medium mb-8">
          Open the reader to pick a story and start listening!
        </p>

        <div className="space-y-4">
          <Link
            href="/library"
            className="next-step-btn w-full"
          >
            <BookOpen className="h-5 w-5" />
            <span>Open Reader</span>
          </Link>

          <Link
            href="/my-words"
            className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl bg-white/70 border-2 border-yellow-200 text-ink font-bold hover:bg-white hover:scale-[1.02] transition-all shadow-sm"
          >
            <span className="text-xl">⭐</span>
            My Collection
          </Link>

          <Link
            href="/story-maker"
            className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl bg-white/70 border-2 border-purple-200 text-ink font-bold hover:bg-white hover:scale-[1.02] transition-all shadow-sm"
          >
            <Wand2 className="h-5 w-5 text-purple-500" />
            Story Maker
          </Link>
        </div>
      </div>
    </main>
  );
}
