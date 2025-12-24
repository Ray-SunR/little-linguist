import books from "../../data/books.json";
import ReaderShell from "../../components/reader/reader-shell";

export default function ReaderPage() {
  return (
    <main className="page-sky relative min-h-screen px-4 py-2 sm:py-4">
      <ReaderShell books={books} />
    </main>
  );
}
