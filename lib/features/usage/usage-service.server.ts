import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key);
};

export interface UsageIdentity {
    user_id?: string;
    guest_id?: string;
    identity_key: string;
}

export interface UsageStatus {
    current: number;
    limit: number;
    isLimitReached: boolean;
}

export async function getOrCreateIdentity(user?: { id: string } | null): Promise<UsageIdentity> {
    if (user) {
        return {
            user_id: user.id,
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
        guest_id: guestId,
        identity_key: guestId
    };
}

export async function checkUsageLimit(
    identityKey: string,
    featureName: string,
    defaultLimit: number
): Promise<UsageStatus> {
    try {
        const supabase = getAdminClient();
        
        const { data: usage, error } = await supabase
            .from("feature_usage")
            .select("current_usage, max_limit")
            .eq("identity_key", identityKey)
            .eq("feature_name", featureName)
            .maybeSingle();

        if (error) throw error;

        const current = usage?.current_usage ?? 0;
        const limit = usage?.max_limit ?? defaultLimit;

        return {
            current,
            limit,
            isLimitReached: current >= limit
        };
    } catch (error) {
        console.error(`[UsageService] Error checking limits for ${featureName}:`, error);
        // Fail closed: if we can't check, assume limit reached to prevent unrestricted use
        return {
            current: 0,
            limit: 0,
            isLimitReached: true
        };
    }
}

/**
 * Atomically checks limit and increments usage in a single transaction.
 * Returns true if successful, false if limit reached or error.
 */
export async function tryIncrementUsage(
    identity: UsageIdentity,
    featureName: string,
    limit: number
): Promise<boolean> {
    try {
        const supabase = getAdminClient();
        
        const { data, error } = await supabase.rpc("increment_feature_usage", {
            p_identity_key: identity.identity_key,
            p_feature_name: featureName,
            p_max_limit: limit,
            p_user_id: identity.user_id,
            p_guest_id: identity.guest_id
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
