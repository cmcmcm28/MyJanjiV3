import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { initialContracts, contractTemplates, contractCategories } from '../utils/dummyData'

const ContractContext = createContext(null)

export function ContractProvider({ children }) {
  const [contracts, setContracts] = useState(initialContracts)

  const addContract = useCallback((contract) => {
    const newContract = {
      ...contract,
      id: `CNT-${Date.now()}`,
      signatureDate: new Date(),
    }
    setContracts(prev => [newContract, ...prev])
    return newContract
  }, [])

  const updateContract = useCallback((contractId, updates) => {
    setContracts(prev => 
      prev.map(c => c.id === contractId ? { ...c, ...updates } : c)
    )
  }, [])

  const getContractById = useCallback((contractId) => {
    return contracts.find(c => c.id.toUpperCase() === contractId.toUpperCase())
  }, [contracts])

  const getContractsByUserId = useCallback((userId) => {
    return contracts.filter(c => c.userId === userId)
  }, [contracts])

  const getPendingContractsForUser = useCallback((userId) => {
    return contracts.filter(c => c.accepteeId === userId && c.status === 'Pending')
  }, [contracts])

  const getAllContractsForUser = useCallback((userId) => {
    return contracts.filter(c => c.userId === userId || c.accepteeId === userId)
  }, [contracts])

  const signContract = useCallback((contractId, signature, isAcceptee = false) => {
    setContracts(prev =>
      prev.map(c => {
        if (c.id === contractId) {
          const updates = isAcceptee
            ? { accepteeSignature: signature, status: 'Ongoing' }
            : { creatorSignature: signature }
          return { ...c, ...updates }
        }
        return c
      })
    )
  }, [])

  const declineContract = useCallback((contractId, declinedBy, declineReason = null) => {
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
  }, [])

  const markAsBreached = useCallback((contractId, breachReason = null) => {
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
  }, [])

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
    templates: contractTemplates,
    categories: contractCategories,
    stats,
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

