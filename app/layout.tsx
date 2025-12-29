import "../styles/globals.css";
import { WordListProvider } from "@/lib/features/word-insight";
import { NarrationProvider } from "@/lib/features/narration";

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
        <WordListProvider>
          <NarrationProvider initialProviderType={process.env.NARRATION_PROVIDER}>
            {children}
          </NarrationProvider>
        </WordListProvider>
      </body>
    </html>
  );
}
