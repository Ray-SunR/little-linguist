"use client";

import { useEffect } from "react";
import DashboardUI from "@/components/dashboard/DashboardUI";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";
import { ChildProfile } from "@/app/actions/profiles";
import type { DashboardStats } from "@/app/actions/dashboard";

interface DashboardContentProps {
  serverProfiles?: ChildProfile[];
  stats?: DashboardStats | null;
}

export default function DashboardContent({ serverProfiles = [], stats = null }: DashboardContentProps) {
  const { user, profiles, activeChild, isLoading, status } = useAuth();
  const router = useRouter();

  // effectiveProfiles combines server data + client data (client wins if populated)
  const effectiveProfiles = profiles.length > 0 ? profiles : serverProfiles;

  // Refresh stats on mount or when activeChild changes to ensure up-to-date points
  useEffect(() => {
    if (activeChild) {
      router.refresh();
    }
  }, [activeChild?.id, router]);

  // DashboardUI handles its own empty states, we just pass activeChild
  return (
    <DashboardUI activeChild={activeChild} stats={stats} />
  );
}
