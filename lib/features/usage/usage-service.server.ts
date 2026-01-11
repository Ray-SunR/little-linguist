import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key);
};

export interface UsageIdentity {
    owner_user_id?: string;
    identity_key: string;
}

export interface UsageStatus {
    current: number;
    limit: number;
    isLimitReached: boolean;
}

export async function getQuotaForUser(
    userId: string | null,
    featureName: string
): Promise<number> {
    const DEFAULT_GUEST_LIMITS: Record<string, number> = {
        word_insight: 5,
        story_generation: 0,
        image_generation: 0
    };

    const DEFAULT_FREE_LIMITS: Record<string, number> = {
        word_insight: 100,
        story_generation: 3,
        image_generation: 10
    };

    if (!userId) {
        return DEFAULT_GUEST_LIMITS[featureName] ?? 0;
    }

    try {
        const supabase = getAdminClient();

        // 1. Get user's subscription status
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("id", userId)
            .single();

        if (profileError) throw profileError;

        const status = profile?.subscription_status || "free";

        // 2. Get quota for that status
        const { data: plan, error: planError } = await supabase
            .from("subscription_plans")
            .select("quotas")
            .eq("code", status)
            .single();

        if (planError) throw planError;

        const quotas = (plan?.quotas as Record<string, number>) || {};
        return quotas[featureName] ?? DEFAULT_FREE_LIMITS[featureName] ?? 0;

    } catch (error) {
        console.error(`[UsageService] Error resolving quota for user ${userId}:`, error);
        return DEFAULT_FREE_LIMITS[featureName] ?? 0;
    }
}

export async function getOrCreateIdentity(user?: { id: string } | null): Promise<UsageIdentity> {
    if (user) {
        return {
            owner_user_id: user.id,
            identity_key: user.id
        };
    }

    const cookieStore = cookies();
    let guestId = cookieStore.get("guest_id")?.value;

    if (!guestId) {
        guestId = globalThis.crypto.randomUUID();
        cookieStore.set("guest_id", guestId, {
            maxAge: 60 * 60 * 24 * 365,
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        });
    }

    return {
        identity_key: guestId
    };
}

/**
 * Checks if a user has reached their limit for a specific feature.
 * Prioritizes the user's current subscription plan limit over the stored limit in feature_usage
 * to ensure that plan upgrades are immediately reflected.
 */
export async function checkUsageLimit(
    identityKey: string,
    featureName: string,
    userId: string | null = null
): Promise<UsageStatus> {
    try {
        const supabase = getAdminClient();
        // 1. Get the authoritative limit from the subscription plan
        const planLimit = await getQuotaForUser(userId, featureName);

        const { data: usage, error } = await supabase
            .from("feature_usage")
            .select("current_usage, max_limit")
            .eq("identity_key", identityKey)
            .eq("feature_name", featureName)
            .maybeSingle();

        if (error) throw error;

        const current = usage?.current_usage ?? 0;

        // Use the plan limit as the source of truth if available, 
        // falling back to the stored limit (e.g. for grandfathered custom limits) only if higher? 
        // For now, let's strictly enforce the plan limit to allow immediate upgrades/downgrades.
        // The RPC will sync the DB row on next write.
        const effectiveLimit = planLimit;

        return {
            current,
            limit: effectiveLimit,
            isLimitReached: current >= effectiveLimit
        };
    } catch (error) {
        console.error(`[UsageService] Error checking limits for ${featureName}:`, error);
        return {
            current: 0,
            limit: 0,
            isLimitReached: true
        };
    }
}
export async function tryIncrementUsage(
    identity: UsageIdentity,
    featureName: string,
    increment: number = 1
): Promise<boolean> {
    try {
        const supabase = getAdminClient();
        const userId = identity.owner_user_id || null;
        const limit = await getQuotaForUser(userId, featureName);

        const { data, error } = await supabase.rpc("increment_feature_usage", {
            p_identity_key: identity.identity_key,
            p_feature_name: featureName,
            p_max_limit: limit,
            p_owner_user_id: userId,
            p_increment: increment
        });

        if (error) throw error;

        // rpc returns a list of rows [ { success, current_count, enforced_limit } ]
        const result = data?.[0];
        return !!result?.success;
    } catch (error) {
        console.error(`[UsageService] Failed to increment usage for ${featureName}:`, error);
        return false;
    }
}

export interface UsageRequest {
    featureName: string;
    increment: number;
}

export async function reserveCredits(
    identity: UsageIdentity,
    requests: UsageRequest[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = getAdminClient();
        const userId = identity.owner_user_id || null;

        // Resolve limits for all requested features in parallel
        const updates = await Promise.all(
            requests.map(async (req) => {
                const max_limit = await getQuotaForUser(userId, req.featureName);
                return {
                    feature_name: req.featureName,
                    increment: req.increment,
                    max_limit
                };
            })
        );

        const { data, error } = await supabase.rpc("increment_batch_feature_usage", {
            p_identity_key: identity.identity_key,
            p_updates: updates,
            p_owner_user_id: userId
        });

        if (error) throw error;

        // Result is [{ success: boolean, error_message: text }]
        const result = data?.[0];

        if (result?.success) {
            return { success: true };
        } else {
            // Parse error message (e.g. "LIMIT_REACHED: image_generation")
            return { success: false, error: result?.error_message || "Unknown error" };
        }

    } catch (error) {
        console.error("[UsageService] Batch reservation failed:", error);
        return { success: false, error: "System error" };
    }
}
