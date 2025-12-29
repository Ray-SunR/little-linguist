import books from "../../data/books.json";
import ReaderShell from "../../components/reader/reader-shell";

export default function ReaderPage() {
  const narrationProvider = (process.env.NARRATION_PROVIDER || "web_speech") as any;

  return (
    <main className="page-sky relative h-screen overflow-hidden px-4 py-2 sm:py-4">
      <ReaderShell books={books} initialINarrationProvider={narrationProvider} />
    </main>
  );
}
