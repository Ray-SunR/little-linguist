'use client'

import { useEffect, useMemo } from 'react'
import { App, URLOpenListenerEvent } from '@capacitor/app'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

export function DeepLinkHandler() {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        // Only run on native platforms
        if (!Capacitor.isNativePlatform()) return;

        let listenerHandle: any = null;

        const setupDeepLinkListener = async () => {
            listenerHandle = await App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
                let url: URL;
                try {
                    url = new URL(event.url)
                } catch (e) {
                    console.error('[DeepLink] Invalid URL received:', event.url);
                    return;
                }

                // Check if it's our auth callback
                if (url.host === 'auth' && url.pathname === '/callback') {
                    // Close the in-app browser
                    await Browser.close()

                    const hash = url.hash.substring(1)
                    const searchParams = new URLSearchParams(hash || url.search)

                    const accessToken = searchParams.get('access_token')
                    const refreshToken = searchParams.get('refresh_token')
                    const code = searchParams.get('code')

                    // Helper to ensure redirect path is relative (prevents open-redirect attacks)
                    const getSafeRedirect = (path: string | null) => {
                        if (!path) return '/';
                        // Strictly allow only paths starting with / and reject any protocol/odd markers
                        if (path.startsWith('/') && !path.includes(':') && !path.includes('\\')) {
                            return path;
                        }
                        return '/';
                    }

                    if (accessToken && refreshToken) {
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        })
                        if (!error) {
                            router.replace(getSafeRedirect(searchParams.get('next')))
                        }
                    } else if (code) {
                        const { error } = await supabase.auth.exchangeCodeForSession(code)
                        if (!error) {
                            router.replace(getSafeRedirect(searchParams.get('next')))
                        }
                    }
                }
            })
        }

        setupDeepLinkListener()

        return () => {
            if (listenerHandle) {
                listenerHandle.remove();
            }
        }
    }, [router, supabase])

    return null
}
