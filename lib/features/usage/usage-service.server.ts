import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !url.startsWith('http')) {
        throw new Error(`Invalid or missing NEXT_PUBLIC_SUPABASE_URL: ${url}`);
    }
    if (!key) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }
    
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
        image_generation: 0,
        magic_sentence: 0
    };

    const DEFAULT_FREE_LIMITS: Record<string, number> = {
        word_insight: 100,
        story_generation: 3,
        image_generation: 10,
        magic_sentence: 5
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

        if (profileError) {
            // Handle race condition where profile is not yet visible to query replicas
            if (profileError.code === "PGRST116") {
                return DEFAULT_FREE_LIMITS[featureName] ?? 0;
            }
            throw profileError;
        }

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
    metadata?: Record<string, any>,
    idempotencyKey?: string,
    entityId?: string,
    entityType?: string
): Promise<boolean> {
    const result = await reserveCredits(identity, [{
        featureName,
        increment,
        childId,
        metadata,
        idempotencyKey,
        entityId,
        entityType
    }]);

    return result.success;
}

export interface UsageRequest {
    featureName: string;
    increment: number;
    childId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
    entityId?: string;
    entityType?: string;
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
                let max_limit = await getQuotaForUser(userId, req.featureName);

                // Check for override
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
                    idempotency_key: req.idempotencyKey || null,
                    entity_id: req.entityId || null,
                    entity_type: req.entityType || null
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

/**
 * Refunds credits for a feature by applying a negative increment.
 * This can be used if an AI task generated fewer assets than reserved.
 */
export async function refundCredits(
    identity: UsageIdentity,
    featureName: string,
    amount: number,
    childId?: string,
    metadata?: Record<string, any>,
    idempotencyKey?: string,
    entityId?: string,
    entityType?: string
): Promise<boolean> {
    if (amount <= 0) return true;

    // Ensure uniqueness for the refund transaction while linking it to the original
    const refundIdempotencyKey = idempotencyKey ? `${idempotencyKey}:refund` : undefined;

    console.log(`[UsageService] Refunding ${amount} credits for ${featureName} to ${identity.identity_key}`);
    return tryIncrementUsage(
        identity,
        featureName,
        -amount,
        childId,
        { ...metadata, is_refund: true },
        refundIdempotencyKey,
        entityId,
        entityType
    );
}
