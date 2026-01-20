import { createClient } from "@/lib/supabase/server";
import { getChildren, ChildProfile } from "@/app/actions/profiles";
import LumoLoader from "@/components/ui/lumo-loader";
import { ProfileHydrator } from "@/components/auth/profile-hydrator";
import DashboardContent from "./DashboardContent";
import { ClientOnly } from "@/components/ui/client-only";
import { getDashboardStats } from "@/app/actions/dashboard";
import DashboardGuestPrompt from "@/components/dashboard/DashboardGuestPrompt";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <DashboardGuestPrompt />;
  }

  // Parallelize data fetches for faster page load
  // Use allSettled to handle partial failures gracefully
  const [profilesSettled, statsSettled] = await Promise.allSettled([
    getChildren(),
    getDashboardStats()
  ]);

  let initialProfiles: ChildProfile[] = [];
  let fetchError = false;

  if (profilesSettled.status === 'fulfilled') {
    const profilesResult = profilesSettled.value;
    if (profilesResult.error) {
      console.error("[Dashboard] Server-side profile fetch failed:", profilesResult.error);
      fetchError = true;
    }
    if (!profilesResult.error && profilesResult.data) {
      initialProfiles = profilesResult.data;
    }
  } else {
    console.error("[Dashboard] Profile fetch rejected:", profilesSettled.reason);
    fetchError = true;
  }

  let stats = null;
  if (statsSettled.status === 'fulfilled') {
    const statsResult = statsSettled.value;
    if (statsResult?.success) {
      stats = statsResult.data;
    }
  } else {
    console.error("[Dashboard] Stats fetch rejected:", statsSettled.reason);
  }

  return (
    <ClientOnly fallback={
      <div className="min-h-screen flex items-center justify-center bg-[--shell]">
        <LumoLoader />
      </div>
    }>
      <ProfileHydrator
        key={user.id}
        initialProfiles={initialProfiles}
        userId={user.id}
        serverError={fetchError}
      />
      <DashboardContent stats={stats} />
    </ClientOnly>
  );
}
