'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function checkEmail(email: string) {
    const supabase = createClient()

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

export async function login(formData: FormData) {
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

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const origin = formData.get('origin') as string

    if (!email || !password) {
        return { error: 'Magic Email and Secret Word are required.' }
    }

    const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        console.error('Signup error:', error.message)
        return { error: error.message }
    }

    if (data.user && !data.session) {
        return { success: 'Check your magic scroll (email) for a verification link!' }
    }
    revalidatePath('/', 'layout')
    redirect('/')
}
