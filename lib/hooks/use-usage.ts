import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UsageStatus {
    current: number;
    limit: number;
    isLimitReached: boolean;
}

export interface UseUsageResult {
    usage: Record<string, UsageStatus>;
    plan: string;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useUsage(features: string[] = ['story_generation', 'image_generation', 'word_insight']): UseUsageResult {
    const [usage, setUsage] = useState<Record<string, UsageStatus>>({});
    const [plan, setPlan] = useState<string>('free');
    const [identityKey, setIdentityKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stable features array to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const stableFeatures = useMemo(() => features, [features.join(',')]);

    const fetchUsage = useCallback(async (options: { silent?: boolean } = {}) => {
        try {
            if (!options.silent) {
                setLoading(true);
            }
            const res = await fetch(`/api/usage?features=${stableFeatures.join(',')}`, {
                headers: { 'Cache-Control': 'no-cache, no-store' },
                cache: 'no-store'
            });
            if (!res.ok) throw new Error('Failed to fetch usage');
            const data = await res.json();
            setUsage(data.usage);
            setPlan(data.plan);
            setIdentityKey(data.identity_key);
            setError(null);
        } catch (err: any) {
            console.error('[useUsage] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [stableFeatures]);

    useEffect(() => {
        fetchUsage();
    }, [fetchUsage]);

    useEffect(() => {
        if (!identityKey) return;

        const supabase = createClient();

        const channel = supabase
            .channel(`usage_updates:${identityKey}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'feature_usage',
                    filter: `identity_key=eq.${identityKey}`,
                },
                (payload) => {
                    const newUsage = payload.new as any;
                    if (newUsage && stableFeatures.includes(newUsage.feature_name)) {
                        setUsage(prev => ({
                            ...prev,
                            [newUsage.feature_name]: {
                                current: newUsage.current_usage,
                                limit: newUsage.max_limit,
                                isLimitReached: newUsage.current_usage >= newUsage.max_limit
                            }
                        }));
                    }

                    // Trigger silent refresh to sync all quotas and plan status
                    // This handles cases where one update (e.g. Word Insight) implies a plan change
                    // that should affect other quotas (e.g. Story Generation).
                    fetchUsage({ silent: true });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [identityKey, stableFeatures, fetchUsage]);

    return {
        usage,
        plan,
        loading,
        error,
        refresh: fetchUsage
    };
}
