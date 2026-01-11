import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateIdentity, checkUsageLimit } from "@/lib/features/usage/usage-service.server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const featureParam = searchParams.get("feature");
        const featuresParam = searchParams.get("features");

        if (!featureParam && !featuresParam) {
            return NextResponse.json({ error: "Feature parameter is required" }, { status: 400 });
        }

        const features = featuresParam ? featuresParam.split(",") : [featureParam!];

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const identity = await getOrCreateIdentity(user);

        let subscriptionStatus = 'free';
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('subscription_status').eq('id', user.id).single();
            subscriptionStatus = profile?.subscription_status || 'free';
        }

        const results: Record<string, any> = {};

        // Fetch all requested features in parallel
        await Promise.all(features.map(async (feat) => {
            results[feat] = await checkUsageLimit(identity.identity_key, feat, user?.id);
        }));

        const responseData = featuresParam ? { usage: results, plan: subscriptionStatus } : results[features[0]];

        return NextResponse.json(responseData);
    } catch (error: any) {
        console.error("[UsageAPI] Error:", error);
        return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
    }
}
