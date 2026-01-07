"use client";

import dynamic from "next/dynamic";
import LumoLoader from "@/components/ui/lumo-loader";

const DashboardContent = dynamic(() => import("./DashboardContent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-shell">
      <LumoLoader />
    </div>
  )
});

export default function DashboardPage() {
  return <DashboardContent />;
}
