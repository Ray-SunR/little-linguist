import { createClient } from "@/lib/supabase/server";
import { getChildren, ChildProfile } from "@/app/actions/profiles";
import { ProfileHydrator } from "@/components/auth/profile-hydrator";
import { Suspense } from "react";
import LumoLoader from "@/components/ui/lumo-loader";
import dynamic from "next/dynamic";
import { getDashboardStats } from "@/app/actions/dashboard";
import DashboardGuestPrompt from "@/components/dashboard/DashboardGuestPrompt";

const DashboardContent = dynamic(() => import("./DashboardContent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-shell">
      <LumoLoader />
    </div>
  )
});

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialProfiles: ChildProfile[] = [];
  let fetchError = false;

  if (user) {
    const { data, error } = await getChildren();
    if (error) {
      console.error("[Dashboard] Server-side profile fetch failed:", error);
      fetchError = true;
    }
    if (!error && data) {
      initialProfiles = data;
    }
  }

  const statsResponse = user ? await getDashboardStats() : null;
  const stats = statsResponse?.success ? statsResponse.data : null;

  if (!user) {
    return <DashboardGuestPrompt />;
  }

  return (
    <>
      <ProfileHydrator
        key={user.id}
        initialProfiles={initialProfiles}
        userId={user.id}
        serverError={fetchError}
      />
      <Suspense fallback={<LumoLoader />}>
        <DashboardContent serverProfiles={initialProfiles} stats={stats} />
      </Suspense>
    </>
  );
}
