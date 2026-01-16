import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/library',
    '/reader',
    '/auth',
    '/legal',
    '/support',
    '/api/word-insight',
    '/api/books',
    '/api/usage',
    '/api/story'
]

const REDIRECT_TO_DASHBOARD = ['/', '/login']

export async function updateSession(request: NextRequest): Promise<NextResponse> {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    function createRedirectWithCookies(path: string) {
        const url = new URL(path, request.url)
        const redirectResponse = NextResponse.redirect(url)

        // Copy cookies from initial response to preserve session state
        supabaseResponse.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })

        return redirectResponse
    }

    const { pathname } = request.nextUrl

    // Bypass for static assets and Next.js internals if they somehow bypass the matcher
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') // Simple way to skip files like favicon.ico, images, etc.
    ) {
        return supabaseResponse
    }

    // Redirect logged-in users away from auth pages
    if (user && REDIRECT_TO_DASHBOARD.includes(pathname)) {
        return createRedirectWithCookies('/dashboard')
    }

    // If no user, handle protection and cleanup
    if (!user) {
        // Clear activeChildId cookie if it exists but no user session exists
        if (request.cookies.has('activeChildId')) {
            supabaseResponse.cookies.set('activeChildId', '', { maxAge: -1, path: '/' })
        }

        const isPublic = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
        
        if (!isPublic) {
            return createRedirectWithCookies('/login')
        }
    }

    return supabaseResponse
}
