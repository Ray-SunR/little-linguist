"use client";

import { usePathname } from "next/navigation";
import { NarrationProvider, type NarrationProviderType } from "@/lib/features/narration";

const NARRATION_ROUTES = ["/reader", "/story-maker"];

export function NarrationGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldProvide = pathname ? NARRATION_ROUTES.some((r) => pathname.startsWith(r)) : false;

  return (
    <NarrationProvider
      enabled={shouldProvide}
      initialProviderType={process.env.NARRATION_PROVIDER as NarrationProviderType | undefined}
    >
      {children}
    </NarrationProvider>
  );
}
