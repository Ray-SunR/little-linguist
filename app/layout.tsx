import "../styles/globals.css";
import { Fredoka, Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Metadata } from "next";
import { WordListProvider } from "@/lib/features/word-insight";
import { NarrationProvider, type NarrationProviderType } from "@/lib/features/narration";
import { ClayNav } from "@/components/layout/clay-nav";
import { GlobalStoryListener } from "@/components/notifications/global-story-listener";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "LumoMind | AI-Powered Language Adventure",
  description: "Your child's magical AI reading companion. Interactive stories, vocabulary building, and language learning adventures.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-shell bg-shell text-ink font-nunito antialiased">
        <WordListProvider>
          <NarrationProvider initialProviderType={process.env.NARRATION_PROVIDER as NarrationProviderType | undefined}>
            <GlobalStoryListener />
            <div className="relative flex flex-col lg:flex-row min-h-screen">
              <ClayNav />
              <div className="flex-1 w-full overflow-y-auto">

                {children}
              </div>
            </div>
          </NarrationProvider>
        </WordListProvider>
        <Analytics />
      </body>
    </html>
  );
}
