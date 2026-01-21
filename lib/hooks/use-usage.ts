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

// Global cache to prevent redundant fetches for identical feature sets within a short window
const usageCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_TTL = 2000; // 2 seconds

export function useUsage(features: string[] = ['story_generation', 'image_generation', 'word_insight', 'magic_sentence']): UseUsageResult {
    const [usage, setUsage] = useState<Record<string, UsageStatus>>({});
    const [plan, setPlan] = useState<string>('free');
    const [identityKey, setIdentityKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Normalize features to a base set to maximize deduplication across components.
    // Most components need the same 3-4 features.
    const featuresKey = features.join(',');
    const baseFeatures = useMemo(() => {
        const set = new Set(['story_generation', 'image_generation', 'word_insight', 'magic_sentence']);
        features.forEach(f => set.add(f));
        return Array.from(set).sort();
    }, [features]);
    
    const cacheKey = baseFeatures.join(',');

    const fetchUsage = useCallback(async (options: { silent?: boolean; force?: boolean } = {}) => {
        try {
            // Check cache first, unless forced
            if (!options.force) {
                const cached = usageCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                    setUsage(cached.data.usage);
                    setPlan(cached.data.plan);
                    setIdentityKey(cached.data.identity_key);
                    setLoading(false);
                    return;
                }
            }

            // Deduplicate in-flight requests
            if (inFlightRequests.has(cacheKey)) {
                const data = await inFlightRequests.get(cacheKey);
                setUsage(data.usage);
                setPlan(data.plan);
                setIdentityKey(data.identity_key);
                setLoading(false);
                return;
            }

            if (!options.silent) {
                setLoading(true);
            }

            const request = (async () => {
                const res = await fetch(`/api/usage?features=${baseFeatures.join(',')}`, {
                    headers: { 'Cache-Control': 'no-cache, no-store' },
                    cache: 'no-store'
                });
                if (!res.ok) throw new Error('Failed to fetch usage');
                return await res.json();
            })();

            inFlightRequests.set(cacheKey, request);
            const data = await request;
            inFlightRequests.delete(cacheKey);

            usageCache.set(cacheKey, { data, timestamp: Date.now() });

            setUsage(data.usage);
            setPlan(data.plan);
            setIdentityKey(data.identity_key);
            setError(null);
        } catch (err: any) {
            inFlightRequests.delete(cacheKey);
            console.error('[useUsage] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [baseFeatures, cacheKey]);

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
                    if (newUsage && baseFeatures.includes(newUsage.feature_name)) {
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
                    fetchUsage({ silent: true, force: true });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [identityKey, baseFeatures, fetchUsage]);

    return {
        usage,
        plan,
        loading,
        error,
        refresh: () => fetchUsage({ force: true })
    };
}
