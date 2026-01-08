import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
                    cookiesToSet.forEach(({ name, value, options }) =>
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

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Helper to create redirect while preserving cookies
    const createRedirectWithCookies = (url: URL) => {
        const redirectResponse = NextResponse.redirect(url)
        // Copy over cookies to prevent session desync
        supabaseResponse.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirectResponse
    }

    // Expert UX: If user is logged in and tries to access /login, redirect to dashboard
    if (user && request.nextUrl.pathname === '/login') {
        return createRedirectWithCookies(new URL('/dashboard', request.url))
    }

    // Expert UX: If user is logged in and tries to access /, redirect to dashboard
    if (user && request.nextUrl.pathname === '/') {
        return createRedirectWithCookies(new URL('/dashboard', request.url))
    }

    const isPublicRoute = [
        "/",
        "/login",
        "/library",
        "/reader/",
        "/dashboard",
        "/my-words",
        "/story-maker",
        "/auth/",
        "/api/word-insight"
    ].some(route => request.nextUrl.pathname.startsWith(route));

    if (!user && !isPublicRoute) {
        return createRedirectWithCookies(new URL('/login', request.url))
    }

    return supabaseResponse
}
