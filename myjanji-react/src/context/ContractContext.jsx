import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { initialContracts, contractTemplates, contractCategories } from '../utils/dummyData'
import { contractService } from '../services/supabase/contractService'
import { storageService } from '../services/supabase/storageService'

const ContractContext = createContext(null)

export function ContractProvider({ children }) {
  const [contracts, setContracts] = useState(initialContracts)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState(contractCategories)
  const [templates, setTemplates] = useState(contractTemplates)

  // Load contracts from Supabase on mount
  useEffect(() => {
    const loadContracts = async () => {
      try {
        // Try to load categories from Supabase
        const { data: categoriesData, error: categoriesError } = await contractService.getCategories()
        if (!categoriesError && categoriesData && categoriesData.length > 0) {
          setCategories(categoriesData)
          // Flatten templates for backward compatibility
          const flatTemplates = categoriesData.flatMap(cat => cat.templates || [])
          setTemplates(flatTemplates)
        }
        // Note: Contracts will be loaded per user when they login
        // For now, we'll keep dummy data as fallback
      } catch (error) {
        console.error('Error loading contracts data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadContracts()
  }, [])

  // Load contracts for a specific user
  const loadUserContracts = useCallback(async (userId) => {
    if (!userId) return
    
    try {
      const { data, error } = await contractService.getUserContracts(userId)
      if (!error && data) {
        setContracts(data)
      } else {
        // Fallback to dummy data filtered by user
        const userContracts = initialContracts.filter(
          c => c.userId === userId || c.accepteeId === userId
        )
        setContracts(userContracts)
      }
    } catch (error) {
      console.error('Error loading user contracts:', error)
      // Fallback to dummy data
      const userContracts = initialContracts.filter(
        c => c.userId === userId || c.accepteeId === userId
      )
      setContracts(userContracts)
    }
  }, [])

  const addContract = useCallback(async (contract) => {
    try {
      // Transform frontend contract structure to database structure
      const contractData = {
        created_user_id: contract.userId || contract.created_user_id,
        acceptee_user_id: contract.accepteeId || contract.acceptee_user_id,
        contract_name: contract.name || contract.contract_name,
        contract_topic: contract.topic || contract.contract_topic,
        status: contract.status || 'Pending',
        template_type: contract.templateType || contract.template_type,
        form_data: contract.formData || contract.form_data,
        due_date: contract.dueDate || contract.due_date,
        creator_nfc_verified: contract.creatorNfcVerified || false,
        creator_face_verified: contract.creatorFaceVerified || false,
      }

      const { data, error } = await contractService.createContract(contractData)
      
      if (!error && data) {
        // Transform database response to frontend structure
        const newContract = {
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
        }
        setContracts(prev => [newContract, ...prev])
        return newContract
      } else {
        // Fallback to local state if Supabase fails
        const newContract = {
          ...contract,
          id: `CNT-${Date.now()}`,
          signatureDate: new Date(),
        }
        setContracts(prev => [newContract, ...prev])
        return newContract
      }
    } catch (error) {
      console.error('Add contract error:', error)
      // Fallback to local state
      const newContract = {
        ...contract,
        id: `CNT-${Date.now()}`,
        signatureDate: new Date(),
      }
      setContracts(prev => [newContract, ...prev])
      return newContract
    }
  }, [])

  const updateContract = useCallback(async (contractId, updates) => {
    try {
      const { data, error } = await contractService.updateContract(contractId, updates)
      
      if (!error && data) {
        // Update local state with transformed data
        setContracts(prev => 
          prev.map(c => c.id === contractId ? data : c)
        )
        return data
      } else {
        // Fallback to local state update
        setContracts(prev => 
          prev.map(c => c.id === contractId ? { ...c, ...updates } : c)
        )
        return contracts.find(c => c.id === contractId)
      }
    } catch (error) {
      console.error('Update contract error:', error)
      // Fallback to local state update
      setContracts(prev => 
        prev.map(c => c.id === contractId ? { ...c, ...updates } : c)
      )
      return contracts.find(c => c.id === contractId)
    }
  }, [contracts])

  const getContractById = useCallback((contractId) => {
    // Use local state (contracts are loaded via loadUserContracts)
    return contracts.find(c => c.id.toUpperCase() === contractId.toUpperCase())
  }, [contracts])

  const getContractsByUserId = useCallback((userId) => {
    return contracts.filter(c => c.userId === userId)
  }, [contracts])

  const getPendingContractsForUser = useCallback((userId) => {
    // Use local state (contracts are loaded via loadUserContracts)
    return contracts.filter(c => c.accepteeId === userId && c.status === 'Pending')
  }, [contracts])

  const getAllContractsForUser = useCallback((userId) => {
    // Use local state (contracts are loaded via loadUserContracts)
    return contracts.filter(c => c.userId === userId || c.accepteeId === userId)
  }, [contracts])

  const signContract = useCallback(async (contractId, signature, isAcceptee = false, userId = null) => {
    try {
      // Convert base64 signature to file
      const base64Data = signature.split(',')[1] || signature
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/png' })
      const file = new File([blob], `signature-${contractId}.png`, { type: 'image/png' })

      // Determine signer type
      const signerType = isAcceptee ? 'acceptee' : 'creator'
      
      // Upload signature to storage
      let signatureUrl = signature // Fallback to base64 if upload fails
      if (userId) {
        const { data: uploadData, error: uploadError } = await storageService.uploadSignature(
          userId,
          contractId,
          file,
          signerType
        )
        if (!uploadError && uploadData) {
          signatureUrl = uploadData.url
        }
      }

      const updates = isAcceptee
        ? { 
            accepteeSignature: signatureUrl, 
            status: 'Ongoing',
            accepteeSignedAt: new Date().toISOString()
          }
        : { 
            creatorSignature: signatureUrl,
            creatorSignedAt: new Date().toISOString()
          }
      
      const { data, error } = await contractService.updateContract(contractId, updates)
      
      if (!error && data) {
        setContracts(prev =>
          prev.map(c => c.id === contractId ? data : c)
        )
        return data
      } else {
        // Fallback to local state update
        setContracts(prev =>
          prev.map(c => {
            if (c.id === contractId) {
              return { ...c, ...updates }
            }
            return c
          })
        )
        return contracts.find(c => c.id === contractId)
      }
    } catch (error) {
      console.error('Sign contract error:', error)
      // Fallback to local state update
      const updates = isAcceptee
        ? { accepteeSignature: signature, status: 'Ongoing' }
        : { creatorSignature: signature }
      setContracts(prev =>
        prev.map(c => {
          if (c.id === contractId) {
            return { ...c, ...updates }
          }
          return c
        })
      )
      return contracts.find(c => c.id === contractId)
    }
  }, [contracts])

  const declineContract = useCallback(async (contractId, declinedBy, declineReason = null) => {
    try {
      const updates = {
        status: 'Declined',
        declinedBy,
        declineReason,
        declinedAt: new Date().toISOString(),
      }
      
      const { data, error } = await contractService.updateContract(contractId, updates)
      
      if (!error && data) {
        setContracts(prev =>
          prev.map(c => c.id === contractId ? data : c)
        )
        return data
      } else {
        // Fallback to local state update
        setContracts(prev =>
          prev.map(c => {
            if (c.id === contractId) {
              return {
                ...c,
                status: 'Declined',
                declinedBy,
                declinedAt: new Date(),
                declineReason,
              }
            }
            return c
          })
        )
        return contracts.find(c => c.id === contractId)
      }
    } catch (error) {
      console.error('Decline contract error:', error)
      // Fallback to local state update
      setContracts(prev =>
        prev.map(c => {
          if (c.id === contractId) {
            return {
              ...c,
              status: 'Declined',
              declinedBy,
              declinedAt: new Date(),
              declineReason,
            }
          }
          return c
        })
      )
      return contracts.find(c => c.id === contractId)
    }
  }, [contracts])

  const markAsBreached = useCallback(async (contractId, breachReason = null) => {
    try {
      const updates = {
        status: 'Breached',
        breachReason,
        breachedAt: new Date().toISOString(),
      }
      
      const { data, error } = await contractService.updateContract(contractId, updates)
      
      if (!error && data) {
        setContracts(prev =>
          prev.map(c => c.id === contractId ? data : c)
        )
        return data
      } else {
        // Fallback to local state update
        setContracts(prev =>
          prev.map(c => {
            if (c.id === contractId) {
              return {
                ...c,
                status: 'Breached',
                breachedAt: new Date(),
                breachReason,
              }
            }
            return c
          })
        )
        return contracts.find(c => c.id === contractId)
      }
    } catch (error) {
      console.error('Mark as breached error:', error)
      // Fallback to local state update
      setContracts(prev =>
        prev.map(c => {
          if (c.id === contractId) {
            return {
              ...c,
              status: 'Breached',
              breachedAt: new Date(),
              breachReason,
            }
          }
          return c
        })
      )
      return contracts.find(c => c.id === contractId)
    }
  }, [contracts])

  const stats = useMemo(() => {
    return {
      total: contracts.length,
      ongoing: contracts.filter(c => c.status === 'Ongoing').length,
      pending: contracts.filter(c => c.status === 'Pending').length,
      completed: contracts.filter(c => c.status === 'Completed').length,
      breached: contracts.filter(c => c.status === 'Breached').length,
      declined: contracts.filter(c => c.status === 'Declined').length,
    }
  }, [contracts])

  const value = {
    contracts,
    templates,
    categories,
    stats,
    loading,
    loadUserContracts,
    addContract,
    updateContract,
    getContractById,
    getContractsByUserId,
    getPendingContractsForUser,
    getAllContractsForUser,
    signContract,
    declineContract,
    markAsBreached,
  }

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  )
}

export function useContracts() {
  const context = useContext(ContractContext)
  if (!context) {
    throw new Error('useContracts must be used within a ContractProvider')
  }
  return context
}

export default ContractContext

