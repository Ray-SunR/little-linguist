import { createClient } from "@/lib/supabase/server";
import { getChildren, ChildProfile } from "@/app/actions/profiles";
import { ProfileHydrator } from "@/components/auth/profile-hydrator";
import { Suspense } from "react";
import LumoLoader from "@/components/ui/lumo-loader";
import dynamic from "next/dynamic";

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
      console.error("[RAIDEN_DIAG][Dashboard] Server-side profile fetch failed:", error);
      fetchError = true;
    }
    if (!error && data) {
      initialProfiles = data;
    }
  }

  return (
    <>
      {user && (
        <ProfileHydrator
          initialProfiles={initialProfiles}
          userId={user.id}
          serverError={fetchError}
        />
      )}
      <Suspense fallback={<LumoLoader />}>
        <DashboardContent serverProfiles={initialProfiles} />
      </Suspense>
    </>
  );
}
