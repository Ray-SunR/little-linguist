"use client";

import { useEffect } from "react";
import DashboardUI from "@/components/dashboard/DashboardUI";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";

export default function DashboardContent() {
  const { profiles, activeChild, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!profiles || profiles.length === 0)) {
       router.push("/onboarding");
    }
  }, [profiles, isLoading, router]);

  // DashboardUI handles its own empty states, we just pass activeChild
  return (
    <DashboardUI activeChild={activeChild} />
  );
}
