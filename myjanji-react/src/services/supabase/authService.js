import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export const authService = {
    // Sign up with email (optional, if you want email auth)
    async signUp(email, password, userData = {}) {
        if (!isSupabaseConfigured()) {
            return { data: null, error: { message: 'Supabase not configured' } }
        }
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData
                }
            })
            return { data, error }
        } catch (error) {
            console.error('Sign up error:', error)
            return { data: null, error }
        }
    },

    // Sign in with email
    async signIn(email, password) {
        if (!isSupabaseConfigured()) {
            return { data: null, error: { message: 'Supabase not configured' } }
        }
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            return { data, error }
        } catch (error) {
            console.error('Sign in error:', error)
            return { data: null, error }
        }
    },

    // Sign out
    async signOut() {
        if (!isSupabaseConfigured()) {
            return { error: { message: 'Supabase not configured' } }
        }
        try {
            const { error } = await supabase.auth.signOut()
            return { error }
        } catch (error) {
            console.error('Sign out error:', error)
            return { error }
        }
    },

    // Get current user
    async getCurrentUser() {
        if (!isSupabaseConfigured()) {
            return { user: null, error: { message: 'Supabase not configured' } }
        }
        try {
            const { data: { user }, error } = await supabase.auth.getUser()
            return { user, error }
        } catch (error) {
            console.error('Get current user error:', error)
            return { user: null, error }
        }
    },

    // Get current session
    async getSession() {
        if (!isSupabaseConfigured()) {
            return { session: null, error: { message: 'Supabase not configured' } }
        }
        try {
            const { data: { session }, error } = await supabase.auth.getSession()
            return { session, error }
        } catch (error) {
            console.error('Get session error:', error)
            return { session: null, error }
        }
    },

    // Listen to auth changes
    onAuthStateChange(callback) {
        if (!isSupabaseConfigured()) {
            return { data: { subscription: { unsubscribe: () => { } } } }
        }
        return supabase.auth.onAuthStateChange(callback)
    }
}

