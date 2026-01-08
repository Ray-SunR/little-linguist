"use client";

import { useEffect } from "react";
import DashboardUI from "@/components/dashboard/DashboardUI";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";

export default function DashboardContent() {
  const { user, profiles, activeChild, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect to onboarding if authenticated but no profiles.
    // Guests (user=null) should be allowed to see the dashboard preview.
    if (!isLoading && user && (!profiles || profiles.length === 0)) {
       router.push("/onboarding");
    }
  }, [profiles, isLoading, router, user]);

  // DashboardUI handles its own empty states, we just pass activeChild
  return (
    <DashboardUI activeChild={activeChild} />
  );
}
