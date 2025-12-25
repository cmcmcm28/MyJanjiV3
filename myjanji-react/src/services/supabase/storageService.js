import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export const storageService = {
  // Upload signature image
  async uploadSignature(userId, contractId, file, signerType = 'creator') {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const fileExt = file.name.split('.').pop() || 'png'
      const fileName = `${userId}/sig-${contractId}-${signerType}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('signatures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('Upload signature error:', error)
        return { data: null, error }
      }
      
      // Get public URL (even though private, we can generate signed URL)
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName)
      
      return { 
        data: { 
          path: fileName, 
          url: publicUrl 
        }, 
        error: null 
      }
    } catch (error) {
      console.error('Upload signature error:', error)
      return { data: null, error }
    }
  },

  // Get signed URL for signature (for private files)
  async getSignatureSignedUrl(userId, contractId, signerType, expiresIn = 3600) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const fileName = `${userId}/sig-${contractId}-${signerType}.png`
      const { data, error } = await supabase.storage
        .from('signatures')
        .createSignedUrl(fileName, expiresIn)
      
      return { data, error }
    } catch (error) {
      console.error('Get signed URL error:', error)
      return { data: null, error }
    }
  },

  // Upload contract PDF
  async uploadContractPDF(contractId, file) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const fileName = `${contractId}.pdf`
      
      const { data, error } = await supabase.storage
        .from('contract-pdfs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting
        })
      
      if (error) {
        console.error('Upload PDF error:', error)
        return { data: null, error }
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contract-pdfs')
        .getPublicUrl(fileName)
      
      return { 
        data: { 
          path: fileName, 
          url: publicUrl 
        }, 
        error: null 
      }
    } catch (error) {
      console.error('Upload PDF error:', error)
      return { data: null, error }
    }
  },

  // Get signed URL (for private files)
  async getSignedUrl(bucket, path, expiresIn = 3600) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)
      return { data, error }
    } catch (error) {
      console.error('Get signed URL error:', error)
      return { data: null, error }
    }
  },

  // Get public URL (for public files)
  async getPublicUrl(bucket, path) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)
      return { data: { publicUrl }, error: null }
    } catch (error) {
      console.error('Get public URL error:', error)
      return { data: null, error }
    }
  }
}

