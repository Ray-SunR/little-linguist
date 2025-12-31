import "../styles/globals.css";
import { WordListProvider } from "@/lib/features/word-insight";
import { NarrationProvider, type NarrationProviderType } from "@/lib/features/narration";
import { Navigation } from "@/components/layout/navigation";

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
          <NarrationProvider initialProviderType={process.env.NARRATION_PROVIDER as NarrationProviderType | undefined}>
            <div className="relative flex flex-col md:flex-row min-h-screen">
              <Navigation />
              <div className="flex-1 w-full overflow-y-auto">
                {children}
              </div>
            </div>
          </NarrationProvider>
        </WordListProvider>
      </body>
    </html>
  );
}
