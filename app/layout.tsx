import "../styles/globals.css";
import { WordListProvider } from "../lib/word-list-context";

export const metadata = {
  title: "Core Reader MVP",
  description: "Kid-friendly read-aloud reader",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-shell text-ink antialiased">
        <WordListProvider>
          {children}
        </WordListProvider>
      </body>
    </html>
  );
}
