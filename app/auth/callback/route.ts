import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    // Validate that "next" is a internal path to prevent open redirects
    let next = searchParams.get('next') ?? '/'
    if (next.startsWith('http://') || next.startsWith('https://') || next.includes('//')) {
        next = '/'
    }

    if (code) {
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const isLocalEnv = process.env.NODE_ENV === 'development'
            
            // Prefer request.url for base if possible, as it's more standard in Next.js
            const requestUrl = new URL(request.url)

            if (isLocalEnv) {
                return NextResponse.redirect(new URL(next, request.url))
            }

            // In production, try to use headers to get the public host
            const forwardedHost = request.headers.get('x-forwarded-host')
            const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
            
            // SECURITY: Ideally, we should validate forwardedHost against an allowlist
            if (forwardedHost) {
                return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`)
            }

            // Fallback: Use the request URL but ensure it's not localhost if we're in production
            return NextResponse.redirect(new URL(next, request.url))
        }
    }

    // return the user to an error page with instructions
    const isLocalEnv = process.env.NODE_ENV === 'development'
    const errorPath = '/auth/auth-code-error'

    if (isLocalEnv) {
        return NextResponse.redirect(new URL(errorPath, request.url))
    }

    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
    
    if (forwardedHost) {
        return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${errorPath}`)
    }

    return NextResponse.redirect(new URL(errorPath, request.url))
}
