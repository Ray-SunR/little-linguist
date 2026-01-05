import "../styles/globals.css";
import { Fredoka, Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { WordListProvider } from "@/lib/features/word-insight";
import { NarrationProvider, type NarrationProviderType } from "@/lib/features/narration";
import { Navigation } from "@/components/layout/navigation";
import { GlobalStoryListener } from "@/components/notifications/global-story-listener";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

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
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-shell bg-shell text-ink font-nunito antialiased">
        <WordListProvider>
          <NarrationProvider initialProviderType={process.env.NARRATION_PROVIDER as NarrationProviderType | undefined}>
            <GlobalStoryListener />
            <div className="relative flex flex-col md:flex-row min-h-screen">
              <Navigation />
              <div className="flex-1 w-full overflow-y-auto">
                {children}
              </div>
            </div>
          </NarrationProvider>
        </WordListProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
