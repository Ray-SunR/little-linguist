import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <div className="emoji-badge" aria-hidden>
        😊
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="inline-pill text-sm uppercase tracking-wide">Friendly Read-Aloud</p>
        <h1 className="text-4xl font-extrabold section-title">Story Time</h1>
        <p className="max-w-2xl text-lg text-ink-muted">
          Cozy, kid-first reading with highlighted words and calm controls.
        </p>
      </div>

      <div className="card-frame w-full max-w-3xl rounded-card card-glow p-8">
        <div className="flex flex-col items-center gap-4">
          <p className="text-base font-semibold text-ink-muted">
            Open the reader to pick a story and start listening.
          </p>
          <Link className="primary-btn touch-target text-lg" href="/reader">
            Open Reader
          </Link>
        </div>
      </div>
    </main>
  );
}
