import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
    const cookieStore = cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const isTest = process.env.NODE_ENV === 'test';

    if (isTest) {
        const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0');
        const isBeta = url.includes('xrertidmfkamnksotadp.supabase.co');
        if (!isLocal && !isBeta) {
            throw new Error(`Forbidden: Cannot create Admin Client for non-local/non-beta URL (${url}) in test mode.`);
        }
    }

    return createServerClient(
        url,
        key,
        {
            cookies: {
                getAll() { return [] },
                setAll() { }
            },
        }
    )
}
