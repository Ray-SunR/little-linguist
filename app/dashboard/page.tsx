import { cookies } from "next/headers";
import { getChildren } from "@/app/actions/profiles";
import DashboardUI from "@/components/dashboard/DashboardUI";
import { ClayNav } from "@/components/layout/clay-nav";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const cookieStore = cookies();
  const activeChildId = cookieStore.get("activeChildId")?.value;

  const { data: children, error } = await getChildren();

  // If no children at all, redirect to onboarding (double safety)
  if (!children || children.length === 0) {
    redirect("/onboarding");
  }

  // Find the active child
  const activeChild = children.find(c => c.id === activeChildId) || children[0];

  return (
    <DashboardUI activeChild={activeChild} />
  );
}

