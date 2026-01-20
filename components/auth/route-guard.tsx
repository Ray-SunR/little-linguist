"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/library',
    '/reader',
    '/auth',
    '/legal',
    '/support',
    '/story-maker'
];

const REDIRECT_TO_DASHBOARD = ['/', '/login'];

export function RouteGuard({ children }: { children: React.ReactNode }) {
    const { user, status } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (status === 'loading' || status === 'hydrating') return;

        const isPublic = PUBLIC_ROUTES.some(route => 
            pathname === route || pathname.startsWith(route + '/')
        );

        // Redirect logged-in users away from auth pages
        if (user && REDIRECT_TO_DASHBOARD.includes(pathname)) {
            router.push('/dashboard');
            return;
        }

        // If no user, handle protection
        if (!user && !isPublic) {
            router.push('/login');
            return;
        }
    }, [user, status, pathname, router]);

    // Optional: Hide content while redirecting if you want to avoid flashes
    // if (status === 'loading' || status === 'hydrating') return <div className="min-h-screen bg-transparent" />;

    return <>{children}</>;
}
