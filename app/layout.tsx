import "../styles/globals.css";
import { WordListProvider } from "../lib/word-list-context";
import { NarrationProvider } from "../lib/narration-context";

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
      <body className="min-h-shell bg-shell text-ink antialiased">
        <NarrationProvider initialProviderType={process.env.NARRATION_PROVIDER}>
          <WordListProvider>
            {children}
          </WordListProvider>
        </NarrationProvider>
      </body>
    </html>
  );
}
