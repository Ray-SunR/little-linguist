import { type NextRequest } from 'next/server'

// Shim process properties for Edge Runtime compatibility with Supabase
// This satisfies both the static analyzer and the runtime requirements
const globalAny = globalThis as any;
if (typeof globalAny.process === 'undefined') {
    globalAny.process = { env: {} };
}
if (!globalAny.process['version']) {
    globalAny.process['version'] = '';
}
if (!globalAny.process['versions']) {
    globalAny.process['versions'] = {};
}

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
