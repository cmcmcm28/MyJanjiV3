import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Flag,
  FileText,
  Search,
  XCircle,
  CheckCircle,
  Shield,
  ShieldAlert,
  Clock,
  Upload,
  Image as ImageIcon,
  X,
  User,
  Wallet,
  AlertCircle,
  Gavel,
  Scale,
  Link2,
  CheckSquare,
  Square,
  Star,
  MessageCircle,
  Bell,
  BellOff,
  TrendingUp,
  History,
  ArrowRight,
  Calendar,
  Award,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useContracts } from '../context/ContractContext'
import { users } from '../utils/dummyData'
import { calculateTrustScore, getTrustScoreColor, getContractStats } from '../utils/trustScore'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'

// Breach category options
const BREACH_CATEGORIES = [
  { value: '', label: 'Select Violation Type...' },
  { value: 'late_return', label: 'Late Return / Overdue' },
  { value: 'item_damaged', label: 'Item Damaged / Not as Described' },
  { value: 'non_payment', label: 'Non-Payment / Payment Default' },
  { value: 'no_contact', label: 'Ghosting / No Contact' },
  { value: 'terms_violated', label: 'Contract Terms Violated' },
  { value: 'unauthorized_use', label: 'Unauthorized Use' },
  { value: 'other', label: 'Other Violation' },
]

// Case statistics by category (simulated precedent data)
const CASE_STATISTICS = {
  late_return: { favorRate: 89, avgDays: 3 },
  item_damaged: { favorRate: 76, avgDays: 5 },
  non_payment: { favorRate: 94, avgDays: 4 },
  no_contact: { favorRate: 82, avgDays: 7 },
  terms_violated: { favorRate: 71, avgDays: 6 },
  unauthorized_use: { favorRate: 88, avgDays: 4 },
  other: { favorRate: 65, avgDays: 7 },
}

// Dispute resolution timeline steps
const DISPUTE_STEPS = [
  { id: 'filed', label: 'Report Filed', icon: Flag },
  { id: 'review', label: 'Under Review', icon: Search },
  { id: 'mediation', label: 'Mediation', icon: MessageCircle },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle },
]

export default function EnforcementPage() {
  const navigate = useNavigate()
  const { currentUser, isAuthenticated, availableUsers } = useAuth()
  const { contracts, getAllContractsForUser, markAsBreached, loadUserContracts } = useContracts()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showBreachModal, setShowBreachModal] = useState(false)
  const [showMediationModal, setShowMediationModal] = useState(false)
  const [breachReason, setBreachReason] = useState('')
  const [breachCategory, setBreachCategory] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [activeFilter, setActiveFilter] = useState('enforceable') // 'enforceable', 'in_progress', 'breached'
  const [declarationChecked, setDeclarationChecked] = useState(false)
  const [notifyUpdates, setNotifyUpdates] = useState(true)
  const [mediationMessage, setMediationMessage] = useState('')

  // Helper to get user details
  const getUserById = (userId) => {
    if (!userId) return null
    const user = availableUsers?.find(u => u.id === userId)
    if (user) return user
    return users[userId] || null
  }

  // Get counterparty trust score
  const getCounterpartyTrustScore = (contract) => {
    const counterparty = getCounterparty(contract)
    if (!counterparty.id) return 3.0
    const stats = getContractStats(contracts, counterparty.id)
    return calculateTrustScore(stats)
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login')
    }
  }, [isAuthenticated, currentUser, navigate])

  // Load contracts
  useEffect(() => {
    if (currentUser?.id) {
      loadUserContracts(currentUser.id)
    }
  }, [currentUser?.id, loadUserContracts])

  // Get user's contracts by category
  const userContracts = useMemo(() => {
    if (!currentUser) return []
    return getAllContractsForUser(currentUser.id)
  }, [currentUser, getAllContractsForUser, contracts])

  // Categorized contracts
  const enforceableContracts = useMemo(() => {
    return userContracts.filter(c => c.status === 'Ongoing')
  }, [userContracts])

  const inProgressContracts = useMemo(() => {
    return userContracts.filter(c => c.status === 'Pending' && c.disputeStatus === 'in_progress')
  }, [userContracts])

  const breachedContracts = useMemo(() => {
    return userContracts.filter(c => c.status === 'Breached')
  }, [userContracts])

  // Current displayed contracts based on filter
  const displayedContracts = useMemo(() => {
    let base = []
    switch (activeFilter) {
      case 'enforceable':
        base = enforceableContracts
        break
      case 'in_progress':
        base = inProgressContracts
        break
      case 'breached':
        base = breachedContracts
        break
      default:
        base = enforceableContracts
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      base = base.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.topic.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query)
      )
    }

    return base
  }, [activeFilter, enforceableContracts, inProgressContracts, breachedContracts, searchQuery])

  // Get contract value (at risk amount)
  const getContractValue = (contract) => {
    const fd = contract.formData || {}
    const amount = fd.loanAmount || fd.loan_amount || 
                   fd.depositAmount || fd.deposit_amount || 
                   fd.projectBudget || fd.project_budget ||
                   fd.totalAmount || fd.total_amount ||
                   fd.amount || 0
    return Number(amount) || 0
  }

  // Get counterparty info
  const getCounterparty = (contract) => {
    const isCreator = contract.userId === currentUser?.id
    const counterpartyId = isCreator ? contract.accepteeId : contract.userId
    const counterpartyName = isCreator 
      ? (contract.accepteeName || getUserById(contract.accepteeId)?.name)
      : (contract.creatorName || getUserById(contract.userId)?.name)
    
    return {
      id: counterpartyId,
      name: counterpartyName || 'Unknown Party',
      initial: (counterpartyName || 'U').charAt(0).toUpperCase(),
    }
  }

  const handleContractClick = (contract) => {
    setSelectedContract(contract)
    setShowBreachModal(true)
  }

  const handleMediationClick = (contract, e) => {
    e?.stopPropagation()
    setSelectedContract(contract)
    setShowMediationModal(true)
  }

  const handleEvidenceUpload = (e) => {
    const files = Array.from(e.target.files)
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }))
    setEvidenceFiles(prev => [...prev, ...newFiles].slice(0, 5)) // Max 5 files
  }

  const removeEvidence = (id) => {
    setEvidenceFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleMarkAsBreached = () => {
    if (!selectedContract) return
    const reason = breachCategory 
      ? `[${BREACH_CATEGORIES.find(c => c.value === breachCategory)?.label}] ${breachReason}`
      : breachReason || 'Contract terms violated'
    markAsBreached(selectedContract.id, reason)
    resetModal()
  }

  const handleRequestMediation = () => {
    // In production, this would create a mediation request
    console.log('Mediation requested for:', selectedContract?.id, mediationMessage)
    setShowMediationModal(false)
    setMediationMessage('')
    setSelectedContract(null)
    // Show success feedback (could use toast notification)
  }

  const resetModal = () => {
    setShowBreachModal(false)
    setBreachReason('')
    setBreachCategory('')
    setEvidenceFiles([])
    setSelectedContract(null)
    setDeclarationChecked(false)
    setNotifyUpdates(true)
  }

  // Get dispute resolution step for breached contracts
  const getDisputeStep = (contract) => {
    // Simulate dispute progress based on breach date
    if (!contract.breachedAt) return 0
    const daysSinceBreach = Math.floor((Date.now() - new Date(contract.breachedAt).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceBreach < 1) return 0 // Filed
    if (daysSinceBreach < 3) return 1 // Under Review
    if (daysSinceBreach < 7) return 2 // Mediation
    return 3 // Resolved
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Enforcement" showLogout />

      {/* Compact Alert Bar */}
      <div className="px-4 mt-4">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-300/50 rounded-xl p-3"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                Dispute Resolution Center
              </p>
              <p className="text-xs text-amber-700/80">
                Select a contract below to initiate a dispute resolution process
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats - 3 columns */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-2">
          {/* Enforceable */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveFilter('enforceable')}
            className={`relative overflow-hidden rounded-xl p-3 transition-all ${
              activeFilter === 'enforceable' 
                ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-green-500/30' 
                : 'bg-surface card-shadow'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <div className={`p-2 rounded-lg ${activeFilter === 'enforceable' ? 'bg-white/20' : 'bg-green-500/10'}`}>
                <Shield className={`h-5 w-5 ${activeFilter === 'enforceable' ? 'text-white' : 'text-green-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${activeFilter === 'enforceable' ? 'text-white' : 'text-header'}`}>
                {enforceableContracts.length}
              </p>
              <p className={`text-[10px] font-medium ${activeFilter === 'enforceable' ? 'text-white/80' : 'text-body/50'}`}>
                Enforceable
              </p>
            </div>
          </motion.button>

          {/* In Progress */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveFilter('in_progress')}
            className={`relative overflow-hidden rounded-xl p-3 transition-all ${
              activeFilter === 'in_progress' 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30' 
                : 'bg-surface card-shadow'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <div className={`p-2 rounded-lg ${activeFilter === 'in_progress' ? 'bg-white/20' : 'bg-amber-500/10'}`}>
                <Clock className={`h-5 w-5 ${activeFilter === 'in_progress' ? 'text-white' : 'text-amber-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${activeFilter === 'in_progress' ? 'text-white' : 'text-header'}`}>
                {inProgressContracts.length}
              </p>
              <p className={`text-[10px] font-medium ${activeFilter === 'in_progress' ? 'text-white/80' : 'text-body/50'}`}>
                In Progress
              </p>
            </div>
          </motion.button>

          {/* Breached */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveFilter('breached')}
            className={`relative overflow-hidden rounded-xl p-3 transition-all ${
              activeFilter === 'breached' 
                ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30' 
                : 'bg-surface card-shadow'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <div className={`p-2 rounded-lg ${activeFilter === 'breached' ? 'bg-white/20' : 'bg-red-500/10'}`}>
                <ShieldAlert className={`h-5 w-5 ${activeFilter === 'breached' ? 'text-white' : 'text-red-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${activeFilter === 'breached' ? 'text-white' : 'text-header'}`}>
                {breachedContracts.length}
              </p>
              <p className={`text-[10px] font-medium ${activeFilter === 'breached' ? 'text-white/80' : 'text-body/50'}`}>
                Breached
              </p>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 mt-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-body/40" />
          <input
            type="text"
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface rounded-xl pl-10 pr-4 py-3 text-body placeholder:text-body/40 card-shadow focus:outline-none focus:ring-2 focus:ring-amber-500/30 border border-transparent focus:border-amber-300"
          />
        </div>
      </div>

      {/* Contract List */}
      <div className="px-4 mt-4 space-y-3">
        <AnimatePresence mode="wait">
          {displayedContracts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card padding="lg" className="text-center">
                {activeFilter === 'breached' && breachedContracts.length === 0 ? (
                  <>
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                      <Shield className="h-10 w-10 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-green-700">All Contracts in Good Standing!</p>
                    <p className="text-sm text-body/50 mt-2">
                      No breached contracts. Keep up the good work!
                    </p>
                  </>
                ) : activeFilter === 'in_progress' && inProgressContracts.length === 0 ? (
                  <>
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Clock className="h-10 w-10 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-amber-700">No Active Disputes</p>
                    <p className="text-sm text-body/50 mt-2">
                      You don't have any ongoing dispute resolutions
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="h-16 w-16 text-body/20 mx-auto mb-4" />
                    <p className="text-body/60 font-medium">
                      {searchQuery 
                        ? `No contracts matching "${searchQuery}"`
                        : 'No active contracts to enforce'}
                    </p>
                    <p className="text-sm text-body/40 mt-2">
                      Only ongoing contracts can be flagged as breached
                    </p>
                  </>
                )}
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {displayedContracts.map((contract, index) => {
                const counterparty = getCounterparty(contract)
                const atRiskValue = getContractValue(contract)
                const isBreached = contract.status === 'Breached'
                const trustScore = getCounterpartyTrustScore(contract)
                const trustColors = getTrustScoreColor(trustScore)
                const disputeStep = isBreached ? getDisputeStep(contract) : -1

                return (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Card
                      padding="md"
                      className={`cursor-pointer border-l-4 hover:shadow-lg transition-all ${
                        isBreached 
                          ? 'border-red-500 bg-red-50/50' 
                          : 'border-amber-500 hover:border-amber-600'
                      }`}
                      onClick={() => !isBreached && handleContractClick(contract)}
                    >
                      {/* Top Section: Avatar + Contract Info + Status */}
                      <div className="flex items-center gap-3">
                        {/* Counterparty Avatar with Online Indicator */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                            isBreached 
                              ? 'bg-gradient-to-br from-red-400 to-red-600' 
                              : 'bg-gradient-to-br from-amber-400 to-orange-600'
                          }`}>
                            {counterparty.initial}
                          </div>
                          {/* Online Indicator */}
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Row 1: Contract Name + Status Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-header truncate text-base">{contract.name}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                              isBreached 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {contract.status}
                            </span>
                          </div>
                          
                          {/* Row 2: Counterparty Name */}
                          <p className={`text-sm font-medium mt-1 ${
                            isBreached ? 'text-red-600' : 'text-amber-700'
                          }`}>
                            {counterparty.name}
                          </p>
                          
                          {/* Row 3: Trust Score + Topic */}
                          <div className="flex items-center gap-2 mt-1.5">
                            {/* Trust Score Stars */}
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${
                                    star <= Math.round(trustScore)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-200 fill-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`text-xs font-bold ${trustColors.text}`}>
                              {trustScore.toFixed(1)}
                            </span>
                            <span className="text-gray-300">•</span>
                            <p className="text-xs text-body/50 truncate">{contract.topic}</p>
                          </div>
                        </div>
                      </div>

                      {/* Dispute Timeline for Breached Contracts */}
                      {isBreached && (
                        <div className="mt-3 pt-3 border-t border-red-100">
                          <p className="text-[10px] text-body/50 uppercase tracking-wider mb-2 font-medium">Dispute Progress</p>
                          <div className="flex items-center gap-1">
                            {DISPUTE_STEPS.map((step, stepIndex) => {
                              const StepIcon = step.icon
                              const isCompleted = stepIndex <= disputeStep
                              const isCurrent = stepIndex === disputeStep
                              
                              return (
                                <div key={step.id} className="flex items-center flex-1">
                                  <div className={`flex flex-col items-center flex-1 ${stepIndex < DISPUTE_STEPS.length - 1 ? '' : ''}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                      isCompleted 
                                        ? isCurrent 
                                          ? 'bg-amber-500 text-white ring-2 ring-amber-200' 
                                          : 'bg-green-500 text-white'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}>
                                      <StepIcon className="h-3.5 w-3.5" />
                                    </div>
                                    <span className={`text-[9px] mt-1 text-center ${isCompleted ? 'text-body/70 font-medium' : 'text-body/40'}`}>
                                      {step.label}
                                    </span>
                                  </div>
                                  {stepIndex < DISPUTE_STEPS.length - 1 && (
                                    <div className={`h-0.5 w-full -mt-4 ${stepIndex < disputeStep ? 'bg-green-400' : 'bg-gray-200'}`} />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {/* Estimated Resolution */}
                          <p className="text-[10px] text-body/50 mt-2 text-center">
                            Estimated resolution: 3-5 business days
                          </p>
                        </div>
                      )}

                      {/* Bottom Row: At Risk Value + Actions */}
                      {!isBreached && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          {/* At Risk Value */}
                          {atRiskValue > 0 ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Wallet className="h-3.5 w-3.5 text-red-500" />
                              <span className="text-body/60">At Risk:</span>
                              <span className="font-bold text-red-600">RM {atRiskValue.toLocaleString()}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-body/40">
                              <FileText className="h-3.5 w-3.5" />
                              <span>No monetary value</span>
                            </div>
                          )}

                          {/* Action Buttons - Mediation + Report Breach */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              icon={MessageCircle}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
                              onClick={(e) => handleMediationClick(contract, e)}
                            >
                              Mediate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              icon={AlertTriangle}
                              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleContractClick(contract)
                              }}
                            >
                              Report
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Breached Footer with History Link */}
                      {isBreached && (
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5 text-xs text-body/50">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Filed: {contract.breachedAt ? new Date(contract.breachedAt).toLocaleDateString('en-MY') : 'Recently'}</span>
                          </div>
                          <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                            <History className="h-3.5 w-3.5" />
                            View History
                          </button>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Breach Report Modal - Enhanced */}
      <Modal
        isOpen={showBreachModal}
        onClose={resetModal}
        title=""
        size="lg"
      >
        {selectedContract && (
          <div className="space-y-5">
            {/* Modal Header - Custom */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <Gavel className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-header">Report Contract Breach</h2>
                <p className="text-sm text-body/60">Initiate dispute resolution process</p>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 mb-1">This action has legal implications</p>
                  <p className="text-sm text-red-700">
                    Filing a breach report will notify the other party and may affect trust scores for both parties.
                  </p>
                </div>
              </div>
            </div>

            {/* Contract & Counterparty Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                {/* Counterparty Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {getCounterparty(selectedContract).initial}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-header">{selectedContract.name}</h3>
                  <p className="text-sm text-amber-700 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Reporting against: {getCounterparty(selectedContract).name}
                  </p>
                  <p className="text-xs text-body/50 mt-1 truncate">
                    Contract ID: {selectedContract.id}
                  </p>
                  {getContractValue(selectedContract) > 0 && (
                    <p className="text-sm font-medium text-red-600 mt-2 flex items-center gap-1.5">
                      <Wallet className="h-4 w-4" />
                      Amount at Risk: RM {getContractValue(selectedContract).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Breach Category Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-header mb-2">
                Violation Type <span className="text-red-500">*</span>
              </label>
              <select
                value={breachCategory}
                onChange={(e) => setBreachCategory(e.target.value)}
                className="w-full bg-surface rounded-xl p-3 text-body border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '20px',
                }}
              >
                {BREACH_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              {/* Case Statistics - Show when category selected */}
              {breachCategory && CASE_STATISTICS[breachCategory] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-800">Similar Case Statistics</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">{CASE_STATISTICS[breachCategory].favorRate}%</p>
                      <p className="text-[10px] text-body/60">Resolved in reporter's favor</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{CASE_STATISTICS[breachCategory].avgDays} days</p>
                      <p className="text-[10px] text-body/60">Avg. resolution time</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Breach Description */}
            <div>
              <label className="block text-sm font-semibold text-header mb-2">
                Describe the Violation
              </label>
              <textarea
                value={breachReason}
                onChange={(e) => setBreachReason(e.target.value)}
                placeholder="Provide details about how the contract terms were violated..."
                className="w-full bg-surface rounded-xl p-3 text-body placeholder:text-body/40 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 resize-none"
                rows={3}
              />
            </div>

            {/* Evidence Upload */}
            <div>
              <label className="block text-sm font-semibold text-header mb-2">
                Upload Evidence (Optional)
              </label>
              <p className="text-xs text-body/50 mb-3">
                Photos, screenshots, or documents to support your claim. Max 5 files.
              </p>
              
              {/* Upload Drop Zone - Blue color scheme */}
              <label className="block">
                <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                  <Upload className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-body/50 mt-1">
                    PNG, JPG, PDF up to 10MB each
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleEvidenceUpload}
                  className="hidden"
                />
              </label>

              {/* Uploaded Files Preview */}
              {evidenceFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {evidenceFiles.map((file) => (
                    <div 
                      key={file.id}
                      className="flex items-center gap-3 bg-gray-50 rounded-lg p-2 pr-3"
                    >
                      {file.file.type.startsWith('image/') ? (
                        <img 
                          src={file.preview} 
                          alt={file.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                      <span className="flex-1 text-sm text-body truncate">{file.name}</span>
                      <button
                        onClick={() => removeEvidence(file.id)}
                        className="p-1 rounded-full hover:bg-red-100 text-body/40 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Perjury Declaration Checkbox */}
            <div 
              className={`rounded-xl p-4 cursor-pointer transition-all ${
                declarationChecked 
                  ? 'bg-green-50 border-2 border-green-300' 
                  : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setDeclarationChecked(!declarationChecked)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {declarationChecked ? (
                    <CheckSquare className="h-5 w-5 text-green-600" />
                  ) : (
                    <Square className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${declarationChecked ? 'text-green-800' : 'text-gray-700'}`}>
                    I declare that the evidence and information provided is true and accurate.
                  </p>
                  <p className="text-xs text-body/50 mt-1">
                    False reporting may lead to account suspension and legal consequences.
                  </p>
                </div>
              </div>
            </div>

            {/* Notification Preference Toggle */}
            <div 
              className="rounded-xl p-4 bg-blue-50 border border-blue-200 cursor-pointer transition-all hover:bg-blue-100"
              onClick={() => setNotifyUpdates(!notifyUpdates)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {notifyUpdates ? (
                    <Bell className="h-5 w-5 text-blue-600" />
                  ) : (
                    <BellOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-blue-900">Notify me of updates</p>
                    <p className="text-xs text-blue-700/70">Receive SMS & email notifications on dispute progress</p>
                  </div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-all ${notifyUpdates ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${notifyUpdates ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            {/* Smart Contract Connection Note */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-slate-600">
                  <span className="font-medium">Blockchain Enforcement:</span> Upon verification, this report will trigger Smart Contract 
                  <span className="font-mono text-blue-600"> #0x{selectedContract.id.slice(-8)}...</span> to freeze the deposit.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                fullWidth
                onClick={resetModal}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                icon={AlertTriangle}
                onClick={handleMarkAsBreached}
                disabled={!breachCategory || !declarationChecked}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
              >
                Submit Breach Report
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Mediation Request Modal */}
      <Modal
        isOpen={showMediationModal}
        onClose={() => {
          setShowMediationModal(false)
          setMediationMessage('')
          setSelectedContract(null)
        }}
        title=""
        size="md"
      >
        {selectedContract && (
          <div className="space-y-5">
            {/* Modal Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-header">Request Mediation</h2>
                <p className="text-sm text-body/60">A softer approach to resolve disputes</p>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">What is Mediation?</p>
                  <p className="text-sm text-blue-700">
                    A neutral third-party will help both parties reach an agreement without formal breach proceedings. This preserves relationships and trust scores.
                  </p>
                </div>
              </div>
            </div>

            {/* Contract Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {getCounterparty(selectedContract).initial}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-header">{selectedContract.name}</h3>
                  <p className="text-sm text-body/60">
                    With: {getCounterparty(selectedContract).name}
                  </p>
                </div>
              </div>
            </div>

            {/* Message to Counterparty */}
            <div>
              <label className="block text-sm font-semibold text-header mb-2">
                Message to {getCounterparty(selectedContract).name}
              </label>
              <textarea
                value={mediationMessage}
                onChange={(e) => setMediationMessage(e.target.value)}
                placeholder="Explain the issue and what you'd like to resolve..."
                className="w-full bg-surface rounded-xl p-3 text-body placeholder:text-body/40 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 resize-none"
                rows={4}
              />
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <Shield className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-green-800">Preserves Trust Score</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <Clock className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-purple-800">Faster Resolution</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setShowMediationModal(false)
                  setMediationMessage('')
                  setSelectedContract(null)
                }}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                icon={MessageCircle}
                onClick={handleRequestMediation}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
              >
                Send Mediation Request
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <BottomNav />
    </div>
  )
}

