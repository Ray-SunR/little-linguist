import SubscriptionUI from "@/components/dashboard/SubscriptionUI";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription & Usage | LumoMind",
  description: "Manage your subscription plan and view usage history.",
};

export default function SubscriptionPage() {
  return <SubscriptionUI />;
}
