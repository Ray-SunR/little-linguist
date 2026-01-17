import "../styles/globals.css";
import { Fredoka, Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Metadata } from "next";
import { ClayNav } from "@/components/layout/clay-nav";
import { GuestBanner } from "@/components/layout/guest-banner";
import { ChildGate } from "@/components/auth/child-gate";
import { WordListGate } from "@/components/providers/word-list-gate";
import { NarrationGate } from "@/components/providers/narration-gate";
import { Toaster } from "sonner";

import dynamic from "next/dynamic";
const GlobalStoryListener = dynamic(
  () =>
    import("@/components/notifications/global-story-listener").then(
      (mod) => mod.GlobalStoryListener
    ),
  { ssr: false, loading: () => null }
);
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

import { AuthProvider } from "@/components/auth/auth-provider";

import { TutorialProvider } from "@/components/tutorial/tutorial-context";
import TutorialOverlay from "@/components/tutorial/tutorial-overlay";

import { CookieConsent } from "@/components/ui/cookie-consent";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-shell bg-shell text-ink font-nunito antialiased">
        <AuthProvider>
          <TutorialProvider>
            <TutorialOverlay />
            <WordListGate>
              <NarrationGate>
                <GlobalStoryListener />
                <ChildGate />
                <div className="relative flex flex-col lg:flex-row min-h-screen">
                  <div className="flex-1 w-full">
                    <GuestBanner />
                    {children}
                  </div>
                  <ClayNav />
                </div>
              </NarrationGate>
            </WordListGate>
          </TutorialProvider>
        </AuthProvider>
        <CookieConsent />
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
