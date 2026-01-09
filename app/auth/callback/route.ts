import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrlFromRequest } from '@/lib/core/utils/url'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    // Validate that "next" is an internal path to prevent open redirects
    let next = searchParams.get('next') ?? '/dashboard'
    if (next.startsWith('http://') || next.startsWith('https://') || next.includes('//')) {
        next = '/dashboard'
    }

    const baseUrl = getBaseUrlFromRequest(request)
    console.log(`[Auth Callback] Initializing on base: ${baseUrl}`)

    if (code) {
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            console.log(`[Auth Callback] Success. Redirecting to: ${baseUrl}${next}`)
            return NextResponse.redirect(`${baseUrl}${next}`)
        }
    }

    // return the user to an error page with instructions
    console.warn(`[Auth Callback] Failed or no code. Redirecting to error page.`)
    return NextResponse.redirect(`${baseUrl}/auth/auth-code-error`)
}
