import SubscriptionUI from "@/components/dashboard/SubscriptionUI";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription & Usage | Little Linguist",
  description: "Manage your subscription plan and view usage history.",
};

export default function SubscriptionPage() {
  return <SubscriptionUI />;
}
