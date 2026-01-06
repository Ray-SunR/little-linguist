"use client";

import LumoLoader from "@/components/ui/lumo-loader";

export default function LibraryLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-shell">
      <LumoLoader />
    </div>
  );
}
