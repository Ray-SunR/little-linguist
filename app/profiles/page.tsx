import { getChildren } from "@/app/actions/profiles";
import ProfileManager from "@/components/profile/ProfileManager";
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
      <main className="flex-grow container max-w-6xl mx-auto px-6 py-12 lg:py-24 relative">
        
        {/* Background Magic */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="hidden sm:block absolute top-[10%] right-[0%] w-[40vh] h-[40vh] bg-purple-400/5 rounded-full blur-[80px] animate-float" />
            <div className="hidden sm:block absolute bottom-[10%] left-[0%] w-[32vh] h-[32vh] bg-accent/5 rounded-full blur-[80px] animate-float" style={{ animationDelay: "-4s" }} />
             <div className="absolute inset-0 bg-noise opacity-15 mix-blend-overlay" />
        </div>

        <ProfileManager initialChildren={children || []} />
      </main>

      <ClayFooter />
    </div>
  );
}
