"use client";

import { notFound } from "next/navigation";
import LandingPageContent from "@/components/landing-page/LandingPageContent";

export default function TestLandingPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <LandingPageContent />;
}
