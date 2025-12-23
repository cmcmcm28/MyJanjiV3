import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export const contractService = {
  // Get all categories with templates
  async getCategories() {
    if (!isSupabaseConfigured()) {
      return { data: null, error: null }
    }
    try {
      // Note: If you have contract_categories and contract_templates tables
      // Otherwise, return the dummy data structure for now
      const { data, error } = await supabase
        .from('contract_categories')
        .select(`
          *,
          contract_templates (
            template_id,
            name,
            description,
            icon_name,
            fields,
            display_order
          )
        `)
        .eq('is_active', true)
        .order('display_order')
      
      if (error && error.code === 'PGRST116') {
        // Table doesn't exist, return null (will use dummy data)
        return { data: null, error: null }
      }
      
      if (error) return { data: null, error }
      
      // Transform to match frontend structure
      if (data) {
        const transformed = data.map(cat => ({
          id: cat.category_id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon_name,
          color: cat.color_gradient,
          templates: (cat.contract_templates || [])
            .sort((a, b) => a.display_order - b.display_order)
            .map(t => ({
              id: t.template_id,
              name: t.name,
              description: t.description,
              icon: t.icon_name,
              fields: t.fields
            }))
        }))
        return { data: transformed, error: null }
      }
      
      return { data: null, error: null }
    } catch (error) {
      console.error('Get categories error:', error)
      return { data: null, error }
    }
  },

  // Get template details
  async getTemplate(templateId) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select(`
          *,
          contract_template_fields (
            field_key,
            field_label,
            field_type,
            is_required,
            validation_rules,
            default_value,
            display_order
          )
        `)
        .eq('template_id', templateId)
        .eq('is_active', true)
        .single()
      
      if (error && error.code === 'PGRST116') {
        return { data: null, error: null }
      }
      
      return { data, error }
    } catch (error) {
      console.error('Get template error:', error)
      return { data: null, error }
    }
  },

  // Create contract
  async createContract(contractData) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      // Generate contract number if not provided
      const contractNumber = contractData.contract_id || `CNT-${Date.now().toString().slice(-6)}`
      
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          contract_id: contractNumber,
          created_user_id: contractData.created_user_id || contractData.userId,
          acceptee_user_id: contractData.acceptee_user_id || contractData.accepteeId,
          contract_name: contractData.contract_name || contractData.name,
          contract_topic: contractData.contract_topic || contractData.topic,
          status: contractData.status || 'Pending',
          template_type: contractData.template_type || contractData.templateType,
          form_data: contractData.form_data || contractData.formData,
          created_at: contractData.created_at || new Date().toISOString(),
          due_date: contractData.due_date || contractData.dueDate,
          creator_nfc_verified: contractData.creator_nfc_verified || false,
          creator_face_verified: contractData.creator_face_verified || false,
          acceptee_nfc_verified: contractData.acceptee_nfc_verified || false,
          acceptee_face_verified: contractData.acceptee_face_verified || false,
        })
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Create contract error:', error)
      return { data: null, error }
    }
  },

  // Get user contracts with creator and acceptee details
  async getUserContracts(userId) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          creator:users!contracts_created_user_id_fkey(user_id, name, email, phone),
          acceptee:users!contracts_acceptee_user_id_fkey(user_id, name, email, phone)
        `)
        .or(`created_user_id.eq.${userId},acceptee_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
      
      if (error) return { data: null, error }
      
      // Transform to match frontend structure with creator/acceptee details
      const transformed = (data || []).map(contract => ({
        id: contract.contract_id,
        name: contract.contract_name,
        topic: contract.contract_topic,
        status: contract.status,
        userId: contract.created_user_id,
        accepteeId: contract.acceptee_user_id,
        // Include creator and acceptee user details
        creatorName: contract.creator?.name || 'Unknown',
        creatorEmail: contract.creator?.email || '',
        creatorPhone: contract.creator?.phone || '',
        accepteeName: contract.acceptee?.name || 'Unknown',
        accepteeEmail: contract.acceptee?.email || '',
        accepteePhone: contract.acceptee?.phone || '',
        signatureDate: contract.created_at ? new Date(contract.created_at) : new Date(),
        dueDate: contract.due_date ? new Date(contract.due_date) : null,
        templateType: contract.template_type,
        formData: contract.form_data,
        creatorSignature: contract.creator_signature_url,
        accepteeSignature: contract.acceptee_signature_url,
        creatorNfcVerified: contract.creator_nfc_verified,
        creatorFaceVerified: contract.creator_face_verified,
        accepteeNfcVerified: contract.acceptee_nfc_verified,
        accepteeFaceVerified: contract.acceptee_face_verified,
        declinedBy: contract.declined_by,
        declineReason: contract.decline_reason,
        pdfUrl: contract.pdf_url,
      }))
      
      return { data: transformed, error: null }
    } catch (error) {
      console.error('Get user contracts error:', error)
      return { data: null, error }
    }
  },

  // Get contract by ID
  async getContract(contractId) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('contract_id', contractId)
        .single()
      
      if (error) return { data: null, error }
      
      // Transform to match frontend structure
      const transformed = {
        id: data.contract_id,
        name: data.contract_name,
        topic: data.contract_topic,
        status: data.status,
        userId: data.created_user_id,
        accepteeId: data.acceptee_user_id,
        signatureDate: data.created_at ? new Date(data.created_at) : new Date(),
        dueDate: data.due_date ? new Date(data.due_date) : null,
        templateType: data.template_type,
        formData: data.form_data,
        creatorSignature: data.creator_signature_url,
        accepteeSignature: data.acceptee_signature_url,
        creatorNfcVerified: data.creator_nfc_verified,
        creatorFaceVerified: data.creator_face_verified,
        accepteeNfcVerified: data.acceptee_nfc_verified,
        accepteeFaceVerified: data.acceptee_face_verified,
        declinedBy: data.declined_by,
        declineReason: data.decline_reason,
        pdfUrl: data.pdf_url,
      }
      
      return { data: transformed, error: null }
    } catch (error) {
      console.error('Get contract error:', error)
      return { data: null, error }
    }
  },

  // Update contract
  async updateContract(contractId, updates) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      // Transform frontend structure to database structure
      const dbUpdates = {}
      
      if (updates.name !== undefined) dbUpdates.contract_name = updates.name
      if (updates.topic !== undefined) dbUpdates.contract_topic = updates.topic
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.formData !== undefined) dbUpdates.form_data = updates.formData
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate
      if (updates.creatorSignature !== undefined) dbUpdates.creator_signature_url = updates.creatorSignature
      if (updates.accepteeSignature !== undefined) dbUpdates.acceptee_signature_url = updates.accepteeSignature
      if (updates.creatorNfcVerified !== undefined) dbUpdates.creator_nfc_verified = updates.creatorNfcVerified
      if (updates.creatorFaceVerified !== undefined) dbUpdates.creator_face_verified = updates.creatorFaceVerified
      if (updates.accepteeNfcVerified !== undefined) dbUpdates.acceptee_nfc_verified = updates.accepteeNfcVerified
      if (updates.accepteeFaceVerified !== undefined) dbUpdates.acceptee_face_verified = updates.accepteeFaceVerified
      if (updates.declinedBy !== undefined) dbUpdates.declined_by = updates.declinedBy
      if (updates.declineReason !== undefined) dbUpdates.decline_reason = updates.declineReason
      if (updates.pdfUrl !== undefined) dbUpdates.pdf_url = updates.pdfUrl
      
      // Handle direct database field names
      Object.keys(updates).forEach(key => {
        if (!['name', 'topic', 'status', 'formData', 'dueDate', 'creatorSignature', 'accepteeSignature', 
              'creatorNfcVerified', 'creatorFaceVerified', 'accepteeNfcVerified', 'accepteeFaceVerified',
              'declinedBy', 'declineReason', 'pdfUrl'].includes(key)) {
          dbUpdates[key] = updates[key]
        }
      })
      
      const { data, error } = await supabase
        .from('contracts')
        .update(dbUpdates)
        .eq('contract_id', contractId)
        .select()
        .single()
      
      if (error) return { data: null, error }
      
      // Transform response
      const transformed = {
        id: data.contract_id,
        name: data.contract_name,
        topic: data.contract_topic,
        status: data.status,
        userId: data.created_user_id,
        accepteeId: data.acceptee_user_id,
        signatureDate: data.created_at ? new Date(data.created_at) : new Date(),
        dueDate: data.due_date ? new Date(data.due_date) : null,
        templateType: data.template_type,
        formData: data.form_data,
        creatorSignature: data.creator_signature_url,
        accepteeSignature: data.acceptee_signature_url,
      }
      
      return { data: transformed, error: null }
    } catch (error) {
      console.error('Update contract error:', error)
      return { data: null, error }
    }
  },

  // Get pending contracts for user
  async getPendingContractsForUser(userId) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('acceptee_user_id', userId)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })
      
      if (error) return { data: null, error }
      
      // Transform to match frontend structure
      const transformed = (data || []).map(contract => ({
        id: contract.contract_id,
        name: contract.contract_name,
        topic: contract.contract_topic,
        status: contract.status,
        userId: contract.created_user_id,
        accepteeId: contract.acceptee_user_id,
        signatureDate: contract.created_at ? new Date(contract.created_at) : new Date(),
        dueDate: contract.due_date ? new Date(contract.due_date) : null,
        templateType: contract.template_type,
        formData: contract.form_data,
      }))
      
      return { data: transformed, error: null }
    } catch (error) {
      console.error('Get pending contracts error:', error)
      return { data: null, error }
    }
  }
}

