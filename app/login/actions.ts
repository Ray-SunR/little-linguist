'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'


export async function checkEmail(email: string) {
    const supabase = createAdminClient()

    if (!email) {
        return { error: 'Magic Email is required.' }
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Email check error:', error.message)
        return { error: 'The portal is hazy. Please try again.' }
    }

    return { exists: !!data }
}

export async function login(formData: FormData, redirectTo?: string) {
    const supabase = createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Magic Email and Secret Word are required.' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.error('Login error:', error.message)
        return { error: error.message }
    }

    // Ensure redirectTo is a relative path to prevent open redirect vulnerabilities
    const isRelative = redirectTo?.startsWith('/') && !redirectTo?.startsWith('//')
    const finalRedirect = isRelative ? redirectTo : '/'

    revalidatePath('/', 'layout')
    redirect(finalRedirect!)
}

export async function signup(formData: FormData, redirectTo?: string) {
    const supabase = createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    // Securely derive origin from headers
    const headersList = headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const origin = `${protocol}://${host}`

    if (!email || !password) {
        return { error: 'Magic Email and Secret Word are required.' }
    }

    // Ensure redirectTo is a relative path for the email callback
    const isRelative = redirectTo?.startsWith('/') && !redirectTo?.startsWith('//')
    const safeNext = isRelative ? redirectTo : '/'

    const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`,
        },
    })

    if (error) {
        console.error('Signup error:', error.message)
        return { error: error.message }
    }

    if (data.user && !data.session) {
        return { success: 'Check your magic scroll (email) for a verification link!' }
    }

    // Ensure redirectTo is a relative path to prevent open redirect vulnerabilities
    const isRedirectRelative = redirectTo?.startsWith('/') && !redirectTo?.startsWith('//')
    const finalRedirect = isRedirectRelative ? redirectTo : '/'

    revalidatePath('/', 'layout')
    redirect(finalRedirect!)
}
