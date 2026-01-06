import { getChildren } from "@/app/actions/profiles";
import ProfileManager from "@/components/profile/ProfileManager";
import { ClayNav } from "@/components/layout/clay-nav";
import { ClayFooter } from "@/components/layout/clay-footer";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: children, error } = await getChildren();

  return (
    <div className="min-h-screen bg-[--shell] font-sans selection:bg-accent selection:text-white overflow-x-hidden flex flex-col">
      <ClayNav />

      <main className="flex-grow container max-w-6xl mx-auto px-6 py-12 lg:py-24 relative">
        
        {/* Background Magic */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-[10%] right-[0%] w-[50vh] h-[50vh] bg-purple-400/5 rounded-full blur-[100px] animate-float" />
            <div className="absolute bottom-[10%] left-[0%] w-[40vh] h-[40vh] bg-accent/5 rounded-full blur-[100px] animate-float" style={{ animationDelay: "-4s" }} />
             <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay" />
        </div>

        <ProfileManager initialChildren={children || []} />
      </main>

      <ClayFooter />
    </div>
  );
}
