"use client";

import { useEffect, useRef } from "react";
import DashboardUI from "@/components/dashboard/DashboardUI";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";
import type { DashboardStats } from "@/app/actions/dashboard";

interface DashboardContentProps {
  stats?: DashboardStats | null;
}

export default function DashboardContent({ stats = null }: DashboardContentProps) {
  const { activeChild } = useAuth();
  const router = useRouter();

  const initialActiveChildId = useRef(activeChild?.id);

  // Refresh stats when activeChild changes to ensure up-to-date points/progress
  useEffect(() => {
    // Only refresh if activeChild exists AND it's different from what we had at mount
    // This avoids the double-refresh on initial page load
    if (activeChild?.id && activeChild.id !== initialActiveChildId.current) {
      console.log("[DashboardContent] Active child changed, refreshing route...");
      router.refresh();
      initialActiveChildId.current = activeChild.id;
    }
  }, [activeChild?.id, router]);

  // DashboardUI handles its own empty states, we just pass activeChild
  return (
    <DashboardUI activeChild={activeChild} stats={stats} />
  );
}
