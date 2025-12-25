import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Search,
  XCircle,
  Filter,
  QrCode,
  Download,
  Eye,
  RefreshCw,
  Shield,
  ExternalLink,
  Copy,
  User,
  ArrowUpDown,
  Wallet,
  Bell,
  Pen,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useContracts } from '../context/ContractContext'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
import ContractList from '../components/contracts/ContractList'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import QRCodeDisplay from '../components/features/QRCodeDisplay'
import pdfService from '../services/pdfService'
import { ContractsPageSkeleton } from '../components/ui/Skeleton'

export default function ContractsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useTranslation()
  const { currentUser, isAuthenticated, availableUsers } = useAuth()
  const { contracts, getAllContractsForUser, loadUserContracts, loading } = useContracts()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [sortBy, setSortBy] = useState('dueDate') // 'dueDate', 'amount', 'createdAt'
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [highlightedContractId, setHighlightedContractId] = useState(null)

  const statusTabs = [
    { id: 'all', label: t('contracts.all'), icon: FileText },
    { id: 'ongoing', label: t('contracts.ongoing'), icon: TrendingUp },
    { id: 'pending', label: t('contracts.pending'), icon: Clock },
    { id: 'completed', label: t('contracts.completed'), icon: CheckCircle },
    { id: 'breached', label: t('contracts.breached'), icon: AlertTriangle },
  ]

  // Helper to get user details
  const getUserById = (userId) => {
    if (!userId) return null
    // Try to find in availableUsers first (from Supabase)
    const user = availableUsers?.find(u => u.id === userId)
    if (user) return user
    return null
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login')
    }
  }, [isAuthenticated, currentUser, navigate])

  // Load contracts from Supabase when user logs in
  useEffect(() => {
    if (currentUser?.id) {
      loadUserContracts(currentUser.id)
    }
  }, [currentUser?.id, loadUserContracts])

  // Get user's contracts
  const userContracts = useMemo(() => {
    if (!currentUser) return []
    return getAllContractsForUser(currentUser.id)
  }, [currentUser, getAllContractsForUser, contracts])

  // Handle URL params for deep linking from notifications (must be after userContracts is defined)
  useEffect(() => {
    const contractId = searchParams.get('contract_id')
    const shouldOpen = searchParams.get('open') === 'true'
    
    if (contractId && userContracts.length > 0) {
      // Set search query to the contract ID for visual feedback
      setSearchQuery(contractId)
      setHighlightedContractId(contractId)
      
      // Switch to 'all' tab to ensure contract is visible
      setActiveTab('all')
      
      // Find and auto-open the contract if 'open=true'
      if (shouldOpen) {
        const contract = userContracts.find(c => c.id === contractId)
        if (contract) {
          // Small delay to let the UI update first
          setTimeout(() => {
            setSelectedContract(contract)
            setShowDetailsModal(true)
          }, 300)
        }
      }
      
      // Clear URL params after processing (keeps URL clean)
      setSearchParams({}, { replace: true })
      
      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedContractId(null)
      }, 3000)
    }
  }, [searchParams, userContracts, setSearchParams])

  // Filter contracts by tab and search
  const filteredContracts = useMemo(() => {
    let filtered = userContracts

    // Filter by tab
    if (activeTab !== 'all') {
      const statusMap = {
        ongoing: 'Ongoing',
        pending: 'Pending',
        completed: 'Completed',
        breached: 'Breached',
        declined: 'Declined',
      }
      filtered = filtered.filter((c) => c.status === statusMap[activeTab])
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.topic.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [userContracts, activeTab, searchQuery])

  // Helper to extract contract value from formData
  const getContractValue = (contract) => {
    const fd = contract.formData || {}
    const amount = fd.loanAmount || fd.loan_amount || 
                   fd.depositAmount || fd.deposit_amount || 
                   fd.projectBudget || fd.project_budget ||
                   fd.totalAmount || fd.total_amount ||
                   fd.amount || 0
    return Number(amount) || 0
  }

  // Calculate smart insights
  const insights = useMemo(() => {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    // Total value in active deals (Ongoing + Pending)
    const activeContracts = userContracts.filter(c => c.status === 'Ongoing' || c.status === 'Pending')
    const totalActiveValue = activeContracts.reduce((sum, c) => sum + getContractValue(c), 0)
    
    // Contracts expiring within 7 days
    const expiringSoon = userContracts.filter(c => {
      if (c.status === 'Completed' || c.status === 'Declined') return false
      const dueDate = c.dueDate instanceof Date ? c.dueDate : new Date(c.dueDate)
      return dueDate && dueDate <= sevenDaysFromNow && dueDate >= now
    })
    
    // Contracts awaiting user action (Pending where user is acceptee)
    const awaitingAction = userContracts.filter(c => 
      c.status === 'Pending' && c.accepteeId === currentUser?.id
    )
    
    return {
      totalActiveValue,
      expiringSoonCount: expiringSoon.length,
      awaitingActionCount: awaitingAction.length,
    }
  }, [userContracts, currentUser])

  // Sort and group contracts
  const sortedAndGroupedContracts = useMemo(() => {
    // First sort
    const sorted = [...filteredContracts].sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return getContractValue(b) - getContractValue(a)
        case 'createdAt':
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0)
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0)
          return dateB - dateA
        case 'dueDate':
        default:
          const dueA = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate || 0)
          const dueB = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate || 0)
          return dueA - dueB
      }
    })

    // Then group by date
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const groups = {
      today: [],
      thisWeek: [],
      older: [],
    }

    sorted.forEach(contract => {
      const dueDate = contract.dueDate instanceof Date ? contract.dueDate : new Date(contract.dueDate)
      if (!dueDate || isNaN(dueDate.getTime())) {
        groups.older.push(contract)
      } else if (dueDate < today) {
        groups.older.push(contract)
      } else if (dueDate.toDateString() === today.toDateString()) {
        groups.today.push(contract)
      } else if (dueDate < weekFromNow) {
        groups.thisWeek.push(contract)
      } else {
        groups.older.push(contract)
      }
    })

    return groups
  }, [filteredContracts, sortBy])

  const handleContractClick = (contract) => {
    setSelectedContract(contract)
    setShowDetailsModal(true)
  }

  const handleViewQR = (contract) => {
    setSelectedContract(contract)
    setShowQRModal(true)
  }

  const handleDownloadPDF = async (contract) => {
    // If contract already has a PDF URL (from backend generation), open it
    if (contract.pdfUrl) {
      window.open(contract.pdfUrl, '_blank')
      return
    }

    // Fallback to client-side generation
    const creator = getUserById(contract.userId)
    const acceptee = getUserById(contract.accepteeId)
    await pdfService.downloadContractPDF(contract, creator, acceptee)
  }

  const handleSignContract = (contract) => {
    navigate(`/sign-contract/${contract.id}`)
  }

  const handleResendContract = (contract) => {
    navigate('/create-contract', {
      state: {
        templateType: contract.templateType,
        formData: contract.formData,
        accepteeId: contract.accepteeId,
        name: contract.name,
        topic: contract.topic,
      }
    })
  }

  if (!currentUser) return null

  // Show skeleton while loading contracts
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title={t('contracts.title')} showLogout />
        <div className="mt-4">
          <ContractsPageSkeleton />
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t('contracts.title')} showLogout />

      {/* Smart Insights */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-3">
          {/* Total Value in Active Deals */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('ongoing')}
            className="bg-gradient-to-br from-emerald-500 via-green-500 to-green-600 rounded-xl p-4 cursor-pointer relative overflow-hidden shadow-md"
          >
            <Wallet className="absolute -bottom-2 -right-2 h-16 w-16 text-white/10" strokeWidth={1.5} />
            <Wallet className="h-5 w-5 text-white/80 mb-1" strokeWidth={1.5} />
            <p className="text-2xl font-bold text-white">
              {insights.totalActiveValue > 0 ? `RM ${insights.totalActiveValue.toLocaleString()}` : '-'}
            </p>
            <p className="text-xs text-white/80 font-medium">Active Value</p>
          </motion.div>

          {/* Expiring Soon */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('ongoing')}
            className={`rounded-xl p-4 cursor-pointer relative overflow-hidden shadow-md ${
              insights.expiringSoonCount > 0 
                ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500' 
                : 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500'
            }`}
          >
            <Bell className="absolute -bottom-2 -right-2 h-16 w-16 text-white/10" strokeWidth={1.5} />
            <Bell className="h-5 w-5 text-white/80 mb-1" strokeWidth={1.5} />
            <p className="text-4xl font-bold text-white">{insights.expiringSoonCount}</p>
            <p className="text-xs text-white/80 font-medium">Expiring Soon</p>
          </motion.div>

          {/* Awaiting Your Action */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('pending')}
            className={`rounded-xl p-4 cursor-pointer relative overflow-hidden shadow-md ${
              insights.awaitingActionCount > 0 
                ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600' 
                : 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500'
            }`}
          >
            <Pen className="absolute -bottom-2 -right-2 h-16 w-16 text-white/10" strokeWidth={1.5} />
            <Pen className="h-5 w-5 text-white/80 mb-1" strokeWidth={1.5} />
            <div className="flex items-center gap-2">
              <p className="text-4xl font-bold text-white">{insights.awaitingActionCount}</p>
              {insights.awaitingActionCount > 0 && (
                <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
              )}
            </div>
            <p className="text-xs text-white/80 font-medium">Awaiting You</p>
          </motion.div>
        </div>
      </div>

      {/* Search Bar with Sort */}
      <div className="px-4 mt-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-body/40" />
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface rounded-xl pl-10 pr-4 py-3 text-body placeholder:text-body/40 card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 bg-surface rounded-xl px-4 py-3 card-shadow text-body/60 hover:text-body transition-colors"
            >
              <ArrowUpDown className="h-4 w-4" />
              <ChevronDown className={`h-4 w-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showSortDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 bg-surface rounded-xl card-shadow py-2 z-20 min-w-[160px]"
              >
                <button
                  onClick={() => { setSortBy('dueDate'); setShowSortDropdown(false) }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${sortBy === 'dueDate' ? 'text-primary font-medium' : 'text-body'}`}
                >
                  <Clock className="h-4 w-4" />
                  Due Date
                  {sortBy === 'dueDate' && <CheckCircle className="h-4 w-4 ml-auto" />}
                </button>
                <button
                  onClick={() => { setSortBy('amount'); setShowSortDropdown(false) }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${sortBy === 'amount' ? 'text-primary font-medium' : 'text-body'}`}
                >
                  <Wallet className="h-4 w-4" />
                  Amount
                  {sortBy === 'amount' && <CheckCircle className="h-4 w-4 ml-auto" />}
                </button>
                <button
                  onClick={() => { setSortBy('createdAt'); setShowSortDropdown(false) }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${sortBy === 'createdAt' ? 'text-primary font-medium' : 'text-body'}`}
                >
                  <FileText className="h-4 w-4" />
                  Created Date
                  {sortBy === 'createdAt' && <CheckCircle className="h-4 w-4 ml-auto" />}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'gradient-primary text-white'
                  : 'bg-surface text-body/60 hover:text-body card-shadow'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contract List - Grouped by Date */}
      <div className="px-4 mt-4 space-y-4">
        {/* Empty State */}
        {filteredContracts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-12 w-12 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-[#1E293B] mb-1">
              {searchQuery ? 'No matches found' : 'No contracts yet'}
            </h3>
            <p className="text-sm text-[#94A3B8] max-w-[250px]">
              {searchQuery 
                ? `We couldn't find any contracts matching "${searchQuery}"`
                : activeTab === 'all' 
                  ? 'Create your first contract to get started!'
                  : `You don't have any ${activeTab} contracts`
              }
            </p>
            {!searchQuery && activeTab === 'all' && (
              <Button
                onClick={() => navigate('/create-contract')}
                className="mt-4"
                icon={FileText}
              >
                Create Contract
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            {/* Today Group */}
            {sortedAndGroupedContracts.today.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Due Today
                </h4>
                <ContractList
                  contracts={sortedAndGroupedContracts.today}
                  onContractClick={handleContractClick}
                  getUserById={getUserById}
                  highlightedId={highlightedContractId}
                />
              </div>
            )}

            {/* This Week Group */}
            {sortedAndGroupedContracts.thisWeek.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  This Week
                </h4>
                <ContractList
                  contracts={sortedAndGroupedContracts.thisWeek}
                  onContractClick={handleContractClick}
                  getUserById={getUserById}
                  highlightedId={highlightedContractId}
                />
              </div>
            )}

            {/* Older / Later Group */}
            {sortedAndGroupedContracts.older.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  {sortBy === 'dueDate' ? 'Later' : 'Older'}
                </h4>
                <ContractList
                  contracts={sortedAndGroupedContracts.older}
                  onContractClick={handleContractClick}
                  getUserById={getUserById}
                  highlightedId={highlightedContractId}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Contract Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Contract Details"
        size="lg"
      >
        {selectedContract && (
          <div className="relative">
            {/* Two-Tone Header Section */}
            <div className="bg-blue-50 -mx-6 -mt-4 px-6 pt-4 pb-5 border-b border-blue-100">
              {/* Status Badge & Contract ID */}
              <div className="flex items-center justify-between mb-3">
                <span className={`
                  inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white shadow-sm
                  ${selectedContract.status === 'Ongoing' ? 'bg-status-ongoing' : ''}
                  ${selectedContract.status === 'Pending' ? 'bg-status-pending' : ''}
                  ${selectedContract.status === 'Completed' ? 'bg-status-completed' : ''}
                  ${selectedContract.status === 'Breached' ? 'bg-status-breached' : ''}
                  ${selectedContract.status === 'Declined' ? 'bg-gray-500' : ''}
                `}>
                  {selectedContract.status === 'Completed' && <CheckCircle size={14} />}
                  {selectedContract.status}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedContract.id)
                  }}
                  className="flex items-center gap-1.5 text-xs font-mono text-blue-600 hover:text-blue-800 transition-colors bg-white/70 px-2 py-1 rounded-lg"
                >
                  <span className="truncate max-w-[120px]">{selectedContract.id}</span>
                  <Copy size={12} />
                </button>
              </div>

              {/* Contract Title */}
              <h3 className="text-xl font-bold text-header">{selectedContract.name}</h3>
              <p className="text-body/60 text-sm">{selectedContract.topic}</p>
            </div>

            {/* White Body Section */}
            <div className="space-y-5 pt-5">
              {/* Decline Info */}
              {selectedContract.status === 'Declined' && selectedContract.declinedAt && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-800 mb-2">Contract Declined</p>
                  <p className="text-xs text-red-700 mb-1">
                    Declined on {new Date(selectedContract.declinedAt).toLocaleDateString('en-MY', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {selectedContract.declineReason && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                      <p className="text-xs text-red-600 font-medium mb-1">Reason:</p>
                      <p className="text-xs text-red-700 italic">"{selectedContract.declineReason}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Parties - ID Card Layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Creator ID Card */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary-mid flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(selectedContract.creatorName || getUserById(selectedContract.userId)?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-semibold text-header text-sm truncate">
                          {selectedContract.creatorName || getUserById(selectedContract.userId)?.name || 'Unknown'}
                        </p>
                        <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      </div>
                      {selectedContract.creatorEmail && (
                        <p className="text-xs text-body/50 truncate">{selectedContract.creatorEmail}</p>
                      )}
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-full">Creator</span>
                    </div>
                  </div>
                </div>

                {/* Acceptee ID Card */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(selectedContract.accepteeName || getUserById(selectedContract.accepteeId)?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-semibold text-header text-sm truncate">
                          {selectedContract.accepteeName || getUserById(selectedContract.accepteeId)?.name || 'Unknown'}
                        </p>
                        {selectedContract.status !== 'Pending' && <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                      </div>
                      {selectedContract.accepteeEmail && (
                        <p className="text-xs text-body/50 truncate">{selectedContract.accepteeEmail}</p>
                      )}
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded-full">Acceptee</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-body/50 mb-1 flex items-center gap-1">
                    <Clock size={12} />
                    Signature Date
                  </p>
                  <p className="font-medium text-header">
                    {selectedContract.signatureDate?.toLocaleDateString('en-MY') || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-body/50 mb-1 flex items-center gap-1">
                    <Clock size={12} />
                    Due Date
                  </p>
                  <p className="font-medium text-header">
                    {selectedContract.dueDate?.toLocaleDateString('en-MY') || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Digital Seal Stamp */}
              {(selectedContract.status === 'Completed' || selectedContract.status === 'Ongoing') && (
                <div className="absolute bottom-20 right-4 opacity-20 rotate-[-15deg] pointer-events-none">
                  <div className="w-24 h-24 rounded-full border-4 border-green-600 flex flex-col items-center justify-center">
                    <Shield size={20} className="text-green-600 mb-1" />
                    <p className="text-[8px] font-bold text-green-600 text-center leading-tight">DIGITALLY<br/>SIGNED</p>
                    <p className="text-[6px] text-green-600">MYJANJI</p>
                  </div>
                </div>
              )}

              {/* Actions - Button Hierarchy */}
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                {/* Primary Actions */}
                <div className="flex flex-wrap gap-2">
                  {selectedContract.pdfUrl && (
                    <Button
                      className="flex-1"
                      icon={Eye}
                      onClick={() => window.open(selectedContract.pdfUrl, '_blank')}
                    >
                      View Signed PDF
                    </Button>
                  )}
                  {selectedContract.status === 'Pending' && selectedContract.accepteeId === currentUser.id && (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      icon={FileText}
                      onClick={() => handleSignContract(selectedContract)}
                    >
                      Sign Contract
                    </Button>
                  )}
                </div>

                {/* Secondary Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    icon={Download}
                    onClick={() => handleDownloadPDF(selectedContract)}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    icon={QrCode}
                    onClick={() => {
                      setShowDetailsModal(false)
                      handleViewQR(selectedContract)
                    }}
                  >
                    View QR
                  </Button>
                  {selectedContract.status === 'Declined' && selectedContract.userId === currentUser.id && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      icon={RefreshCw}
                      onClick={() => {
                        setShowDetailsModal(false)
                        handleResendContract(selectedContract)
                      }}
                    >
                      Resend
                    </Button>
                  )}
                </div>

                {/* Tertiary Action - Blockchain Hash */}
                {(selectedContract.status === 'Completed' || selectedContract.status === 'Ongoing') && (
                  <button
                    className="w-full text-center text-sm text-primary-mid hover:text-primary-dark transition-colors flex items-center justify-center gap-1.5 py-2"
                    onClick={() => {
                      // TODO: Link to blockchain explorer
                      navigator.clipboard.writeText(`0x${selectedContract.id.replace(/-/g, '').slice(0, 40)}`)
                    }}
                  >
                    <ExternalLink size={14} />
                    View Blockchain Hash
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Contract QR Code"
      >
        {selectedContract && (
          <QRCodeDisplay
            value={`myjanji://contract/${selectedContract.id}`}
            title={selectedContract.name}
            description="Scan to view contract details"
          />
        )}
      </Modal>

      <BottomNav />
    </div>
  )
}

