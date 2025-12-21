import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export const userService = {
  // Create user profile
  async createProfile(userId, profileData) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          user_id: userId,
          ...profileData
        })
        .select()
        .single()
      return { data, error }
    } catch (error) {
      console.error('Create profile error:', error)
      return { data: null, error }
    }
  },

  // Get user profile
  async getProfile(userId) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single()
      return { data, error }
    } catch (error) {
      console.error('Get profile error:', error)
      return { data: null, error }
    }
  },

  // Update user profile
  async updateProfile(userId, updates) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()
      return { data, error }
    } catch (error) {
      console.error('Update profile error:', error)
      return { data: null, error }
    }
  },

  // Get user by IC number (if you have ic_hash field)
  async getUserByIC(icHash) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('ic_hash', icHash)
        .single()
      return { data, error }
    } catch (error) {
      console.error('Get user by IC error:', error)
      return { data: null, error }
    }
  },

  // Get all users (for demo/login purposes)
  async getAllUsers() {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      return { data, error }
    } catch (error) {
      console.error('Get all users error:', error)
      return { data: null, error }
    }
  }
}

