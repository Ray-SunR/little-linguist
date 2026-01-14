import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";

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
    const cookieStore = cookies();
    let guestId = cookieStore.get("guest_id")?.value;

    if (user) {
        // Audit: Identity Merged (from Guest to User)
        if (guestId && guestId !== user.id) {
            // We use a detached promise to avoid blocking the main flow
            AuditService.log({
                action: AuditAction.IDENTITY_MERGED,
                entityType: EntityType.USER,
                entityId: user.id,
                userId: user.id,
                identityKey: user.id,
                details: { previous_guest_id: guestId }
            }).catch(e => console.error("[UsageService] Failed to log identity merge:", e));

            // Clear the guest cookie so we don't merge/log it again on every request
            try {
                cookieStore.delete("guest_id");
            } catch (e) {
                // Ignore if we can't delete (e.g. read-only context)
            }
        }

        return {
            owner_user_id: user.id,
            identity_key: user.id
        };
    }

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

        // Use the higher of the plan limit or the stored limit (to support custom overrides)
        const storedLimit = usage?.max_limit ?? 0;
        const effectiveLimit = Math.max(planLimit, storedLimit);

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
    increment: number = 1,
    childId?: string,
    metadata?: Record<string, any>
): Promise<boolean> {
    const result = await reserveCredits(identity, [{
        featureName,
        increment,
        childId,
        metadata
    }]);

    return result.success;
}

export interface UsageRequest {
    featureName: string;
    increment: number;
    childId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
}

export async function reserveCredits(
    identity: UsageIdentity,
    requests: UsageRequest[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = getAdminClient();
        const userId = identity.owner_user_id || null;

        // Resolve plan quota once for all features in the batch
        // This is much faster than fetching it for each feature individually
        const quotas = await getQuotasForUser(userId);

        const updates = await Promise.all(
            requests.map(async (req) => {
                let max_limit = quotas[req.featureName] || 0;

                // Check for override in the usage table
                const { data: usage } = await supabase
                    .from("feature_usage")
                    .select("max_limit")
                    .eq("identity_key", identity.identity_key)
                    .eq("feature_name", req.featureName)
                    .maybeSingle();

                if (usage?.max_limit && usage.max_limit > max_limit) {
                    max_limit = usage.max_limit;
                }

                return {
                    feature_name: req.featureName,
                    increment: req.increment,
                    max_limit,
                    child_id: req.childId || null,
                    metadata: req.metadata || {},
                    idempotency_key: req.idempotencyKey || null
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
            return { success: false, error: result?.error_message || "Unknown error" };
        }

    } catch (error) {
        console.error("[UsageService] Batch reservation failed:", error);
        return { success: false, error: "System error" };
    }
}

/**
 * Highly optimized helper to get all quotas for a user in one go.
 */
async function getQuotasForUser(userId: string | null): Promise<Record<string, number>> {
    const DEFAULT_FREE_LIMITS: Record<string, number> = {
        word_insight: 100,
        story_generation: 3,
        image_generation: 10
    };

    const DEFAULT_GUEST_LIMITS: Record<string, number> = {
        word_insight: 5,
        story_generation: 0,
        image_generation: 0
    };

    if (!userId) return DEFAULT_GUEST_LIMITS;

    try {
        const supabase = getAdminClient();
        const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("id", userId)
            .single();

        const status = profile?.subscription_status || "free";

        const { data: plan } = await supabase
            .from("subscription_plans")
            .select("quotas")
            .eq("code", status)
            .single();

        return (plan?.quotas as Record<string, number>) || DEFAULT_FREE_LIMITS;
    } catch (error) {
        return DEFAULT_FREE_LIMITS;
    }
}

/**
 * Refunds credits for a feature by applying a negative increment.
 */
export async function refundCredits(
    identity: UsageIdentity,
    featureName: string,
    amount: number,
    childId?: string,
    metadata?: Record<string, any>,
    idempotencyKey?: string
): Promise<boolean> {
    if (amount <= 0) return true;

    // Generate a derived idempotency key if one isn't provided to prevent double-refunding
    const refundKey = idempotencyKey ? `refund:${idempotencyKey}:${featureName}` : undefined;

    console.log(`[UsageService] Refunding ${amount} credits for ${featureName} to ${identity.identity_key}`);

    const result = await reserveCredits(identity, [{
        featureName,
        increment: -amount,
        childId,
        metadata: { ...metadata, is_refund: true },
        idempotencyKey: refundKey
    }]);

    return result.success;
}

/**
 * A robust wrapper that handles the entire "Reserve -> Run -> Cleanup" lifecycle.
 */
export async function withUsageReservation<T>(
    identity: UsageIdentity,
    requests: UsageRequest[],
    onFailure: (error: string) => Promise<NextResponse>,
    action: (reservation: { refund: (feature: string, amount: number, reason?: string) => Promise<void> }) => Promise<T>
): Promise<T | NextResponse> {
    // 1. Reserve
    const reservationResult = await reserveCredits(identity, requests);

    if (!reservationResult.success) {
        return onFailure(reservationResult.error || "RESERVATION_FAILED");
    }

    // Tracker for what has been used vs reserved
    const usageTracker: Record<string, { reserved: number; used: number }> = {};
    requests.forEach(r => {
        usageTracker[r.featureName] = { reserved: r.increment, used: r.increment };
    });

    const refund = async (featureName: string, amount: number, reason?: string) => {
        if (amount <= 0) return;

        // Find the original request to get metadata and childId
        const req = requests.find(r => r.featureName === featureName);

        await refundCredits(
            identity,
            featureName,
            amount,
            req?.childId,
            { ...req?.metadata, refund_reason: reason },
            req?.idempotencyKey
        );

        if (usageTracker[featureName]) {
            usageTracker[featureName].used -= amount;
        }
    };

    try {
        // 2. Execute Action
        return await action({ refund });
    } catch (error) {
        // 3. Catastrophic failure: Refund everything remaining
        console.error("[UsageService] Action failed, refunding all reserved credits:", error);

        for (const [featureName, stats] of Object.entries(usageTracker)) {
            if (stats.used > 0) {
                await refund(featureName, stats.used, "CATASTROPHIC_FAILURE");
            }
        }

        throw error;
    }
}
