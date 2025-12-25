// Template Service - Fetches contract categories & templates from Supabase Storage
// No database tables needed - uses config.json in the bucket

import { supabase, isSupabaseConfigured } from '../../lib/supabase'

const TEMPLATE_BUCKET = 'contract_templates'
const CONFIG_FILE = 'config.json'

export const templateService = {
  /**
   * Fetch all categories and templates from config.json in Supabase Storage
   * Returns the full category structure with templates
   */
  async getCategories() {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, using fallback data')
      return { data: null, error: null }
    }

    try {
      // Get public URL for config.json
      const { data: urlData } = supabase.storage
        .from(TEMPLATE_BUCKET)
        .getPublicUrl(CONFIG_FILE)

      if (!urlData?.publicUrl) {
        console.error('Could not get public URL for config.json')
        return { data: null, error: { message: 'Could not get public URL' } }
      }

      console.log('📥 Fetching config from:', urlData.publicUrl)

      // Fetch the JSON file directly via public URL
      const response = await fetch(urlData.publicUrl)
      
      if (!response.ok) {
        console.error('Failed to fetch config.json:', response.status, response.statusText)
        return { data: null, error: { message: `HTTP ${response.status}: ${response.statusText}` } }
      }

      const config = await response.json()
      console.log('✅ Loaded categories from Supabase:', config.categories?.length || 0)

      return { data: config.categories, error: null }
    } catch (error) {
      console.error('Error fetching categories:', error)
      return { data: null, error }
    }
  },

  /**
   * Get a specific template's metadata by ID
   */
  async getTemplate(templateId) {
    const { data: categories, error } = await this.getCategories()
    
    if (error || !categories) {
      return { data: null, error: error || { message: 'No categories found' } }
    }

    // Find template across all categories
    for (const category of categories) {
      const template = category.templates.find(t => t.id === templateId)
      if (template) {
        return { 
          data: { 
            ...template, 
            category: {
              id: category.id,
              name: category.name,
              folder: category.folder,
              color: category.color
            }
          }, 
          error: null 
        }
      }
    }

    return { data: null, error: { message: 'Template not found' } }
  },

  /**
   * Get the storage path for a template file
   * Returns: "Items & Assets/ITEM_BORROW.docx"
   */
  async getTemplatePath(templateId) {
    const { data: template, error } = await this.getTemplate(templateId)
    
    if (error || !template) {
      return { path: null, error: error || { message: 'Template not found' } }
    }

    const path = `${template.category.folder}/${template.filename}`
    return { path, error: null }
  },

  /**
   * List all template files in a category folder
   * Useful for verifying files exist
   */
  async listTemplateFiles(categoryFolder) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }

    try {
      const { data, error } = await supabase.storage
        .from(TEMPLATE_BUCKET)
        .list(categoryFolder, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        })

      if (error) {
        return { data: null, error }
      }

      // Filter to only .docx files
      const templates = data.filter(file => file.name.endsWith('.docx'))
      return { data: templates, error: null }
    } catch (error) {
      console.error('Error listing templates:', error)
      return { data: null, error }
    }
  },

  /**
   * Get public URL for a template (for preview/download)
   */
  getTemplateUrl(categoryFolder, filename) {
    if (!isSupabaseConfigured()) {
      return null
    }

    const { data } = supabase.storage
      .from(TEMPLATE_BUCKET)
      .getPublicUrl(`${categoryFolder}/${filename}`)

    return data.publicUrl
  }
}
