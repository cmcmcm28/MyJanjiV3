import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Search,
  QrCode,
  Download,
  Eye,
  RefreshCw,
  Plus,
  Calendar,
  MessageSquare,
  History,
  ChevronRight,
  PlayCircle,
  Car,
  Package,
  Receipt,
  Banknote,
  Briefcase,
  ShoppingBag,
  PenLine,
  Users,
  Copy,
  Shield,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useContracts } from '../context/ContractContext'
import { users } from '../utils/dummyData'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import QRCodeDisplay from '../components/features/QRCodeDisplay'
import pdfService from '../services/pdfService'
import { DashboardSkeleton } from '../components/ui/Skeleton'

// Helper to get greeting key based on time
const getGreetingKey = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'dashboard.greeting.morning'
  if (hour < 18) return 'dashboard.greeting.afternoon'
  return 'dashboard.greeting.evening'
}

// Helper to format date nicely
const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Helper to get days until deadline
const getDaysUntil = (date) => {
  if (!date) return null
  const now = new Date()
  const due = new Date(date)
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  return diff
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { currentUser, isAuthenticated, availableUsers } = useAuth()
  const { contracts, getAllContractsForUser, getPendingContractsForUser, stats, loadUserContracts, loading } = useContracts()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute for real-time progress bars
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Helper to get user details
  const getUserById = (userId) => {
    if (!userId) return null
    // Try to find in availableUsers first
    const user = availableUsers?.find(u => u.id === userId)
    if (user) return user
    // Fallback to dummy data lookup
    return users[userId]
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

  // Get pending contracts for signing (where user is acceptee)
  const pendingForSigning = useMemo(() => {
    if (!currentUser) return []
    return getPendingContractsForUser(currentUser.id)
  }, [currentUser, getPendingContractsForUser, contracts])

  // Calculate stats for current user
  const userStats = useMemo(() => {
    const ongoing = userContracts.filter((c) => c.status === 'Ongoing').length
    const pending = userContracts.filter((c) => c.status === 'Pending').length
    const completed = userContracts.filter((c) => c.status === 'Completed').length
    return { ongoing, pending, completed }
  }, [userContracts])

  // Get upcoming deadlines (contracts with due dates in the future, sorted by nearest)
  const upcomingDeadlines = useMemo(() => {
    const now = new Date()
    return userContracts
      .filter((c) => c.dueDate && new Date(c.dueDate) > now && c.status === 'Ongoing')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 3)
  }, [userContracts])

  // Get recent activity (last 5 contracts by signature date)
  const recentActivity = useMemo(() => {
    return [...userContracts]
      .sort((a, b) => new Date(b.signatureDate) - new Date(a.signatureDate))
      .slice(0, 5)
  }, [userContracts])

  // Filter contracts by search
  const searchResults = useMemo(() => {
    if (!searchQuery) return []
    const query = searchQuery.toLowerCase()
    return userContracts
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.topic?.toLowerCase().includes(query) ||
          c.id?.toLowerCase().includes(query)
      )
      .slice(0, 5)
  }, [userContracts, searchQuery])

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
        <Header title="MyJanji" showLogout />
        <div className="mt-4">
          <DashboardSkeleton />
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="MyJanji" showLogout />

      {/* 1. Greeting & Search */}
      <div className="px-4 mt-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-2xl font-bold text-header">
            {t(getGreetingKey())}, <span className="text-primary">{currentUser.name?.split(' ')[0]}</span>.
          </h1>
          <p className="text-body/60 text-sm mt-1">{t('dashboard.manageEfficiently')}</p>
        </motion.div>

        {/* Search Bar - Sticky */}
        <div className="sticky top-0 z-10 bg-background py-2 -mx-4 px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-body/40" />
            <input
              type="text"
              placeholder={t('dashboard.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface rounded-xl pl-10 pr-4 py-3 text-body placeholder:text-body/40 card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Search Results Dropdown */}
        {searchQuery && searchResults.length > 0 && (
          <Card className="mt-2 p-2">
            {searchResults.map((contract) => (
              <div
                key={contract.id}
                onClick={() => {
                  handleContractClick(contract)
                  setSearchQuery('')
                }}
                className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-header text-sm">{contract.name}</p>
                  <p className="text-xs text-body/50">{contract.topic}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full text-white
                  ${contract.status === 'Ongoing' ? 'bg-status-ongoing' : ''}
                  ${contract.status === 'Pending' ? 'bg-status-pending' : ''}
                  ${contract.status === 'Completed' ? 'bg-status-completed' : ''}
                  ${contract.status === 'Breached' ? 'bg-status-breached' : ''}
                `}>
                  {contract.status}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* 2. Agreement Summary */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-header mb-4">{t('dashboard.agreementSummary')}</h2>
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/contracts?filter=ongoing')}
            className="bg-gradient-to-br from-emerald-500 via-green-500 to-green-600 rounded-xl p-4 cursor-pointer relative overflow-hidden shadow-md"
          >
            <TrendingUp className="absolute -bottom-2 -right-2 h-16 w-16 text-white/10" strokeWidth={1.5} />
            <TrendingUp className="h-5 w-5 text-white/80 mb-1" strokeWidth={1.5} />
            <p className="text-4xl font-bold text-white">{userStats.ongoing}</p>
            <p className="text-xs text-white/80 font-medium">{t('dashboard.active')}</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/contracts?filter=pending')}
            className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-xl p-4 cursor-pointer relative overflow-hidden shadow-md"
          >
            <Clock className="absolute -bottom-2 -right-2 h-16 w-16 text-white/10" strokeWidth={1.5} />
            <Clock className="h-5 w-5 text-white/80 mb-1" strokeWidth={1.5} />
            <p className="text-4xl font-bold text-white">{userStats.pending}</p>
            <p className="text-xs text-white/80 font-medium">{t('dashboard.pending')}</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/contracts?filter=completed')}
            className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl p-4 cursor-pointer relative overflow-hidden shadow-md"
          >
            <CheckCircle className="absolute -bottom-2 -right-2 h-16 w-16 text-white/10" strokeWidth={1.5} />
            <CheckCircle className="h-5 w-5 text-white/80 mb-1" strokeWidth={1.5} />
            <p className="text-4xl font-bold text-white">{userStats.completed}</p>
            <p className="text-xs text-white/80 font-medium">{t('dashboard.completed')}</p>
          </motion.div>
        </div>
      </div >

      {/* 3. Upcoming Deadlines */}
      {
        upcomingDeadlines.length > 0 && (
          <div className="px-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-header">{t('dashboard.upcomingDeadlines')}</h2>
              <button
                onClick={() => navigate('/contracts')}
                className="text-sm text-primary flex items-center gap-1"
              >
                {t('dashboard.viewAll')} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines.map((contract) => {
                const daysLeft = getDaysUntil(contract.dueDate)
                // Calculate time elapsed percentage (assuming contract started at signatureDate)
                const startDate = new Date(contract.signatureDate || contract.createdAt || Date.now() - 30 * 24 * 60 * 60 * 1000)
                const endDate = new Date(contract.dueDate)
                const totalDuration = endDate - startDate
                const elapsed = currentTime - startDate
                const progressPercent = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
                
                return (
                  <motion.div
                    key={contract.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handleContractClick(contract)}
                    className={`bg-surface rounded-xl p-4 shadow-sm cursor-pointer border-l-4 ${daysLeft <= 3 ? 'border-red-500' : daysLeft <= 7 ? 'border-amber-500' : 'border-green-500'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-header">{contract.name}</p>
                        <p className="text-xs text-body/50">
                          With: {contract.accepteeName || getUserById(contract.accepteeId)?.name || getUserById(contract.userId)?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${daysLeft <= 3 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-green-500'
                          }`}>
                          {daysLeft} {t('dashboard.daysLeft')}
                        </p>
                        <p className="text-xs text-body/50">{formatDate(contract.dueDate)}</p>
                      </div>
                    </div>
                    {/* Time Elapsed Progress Bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-body/50 mb-1">
                        <span>Time Elapsed</span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className={`h-full rounded-full ${progressPercent >= 90 ? 'bg-red-500' : progressPercent >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      }

      {/* Pending Contracts for Signing */}
      {
        pendingForSigning.length > 0 && (
          <div className="px-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-header">{t('dashboard.awaitingYourSignature')}</h2>
              <span className="text-xs bg-status-pending/10 text-status-pending px-2 py-1 rounded-full font-medium">
                {pendingForSigning.length} {t('dashboard.pending').toLowerCase()}
              </span>
            </div>
            <div className="space-y-2">
              {pendingForSigning.slice(0, 2).map((contract) => (
                <motion.div
                  key={contract.id}
                  whileHover={{ scale: 1.01 }}
                  className="bg-surface rounded-xl p-4 shadow-sm border-l-4 border-status-pending"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-header truncate">{contract.name}</p>
                      <p className="text-xs text-body/50">
                        From: {contract.creatorName || getUserById(contract.userId)?.name || 'Unknown'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSignContract(contract)}
                      icon={PenLine}
                      className="shrink-0"
                    >
                      Review & Sign
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )
      }

      {/* 4. Recent Activity */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-header">{t('dashboard.recentActivity')}</h2>
          <button
            onClick={() => navigate('/contracts')}
            className="text-sm text-primary flex items-center gap-1"
          >
            {t('dashboard.viewAll')} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {recentActivity.length > 0 ? (
          <Card padding="none" className="divide-y divide-gray-100">
            {recentActivity.map((contract) => {
              // Get icon and colors based on template type/category
              const getTemplateStyle = (templateType) => {
                switch (templateType) {
                  case 'VEHICLE_USE':
                    return { Icon: Car, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' }
                  case 'ITEM_BORROW':
                    return { Icon: Package, bgColor: 'bg-cyan-100', iconColor: 'text-cyan-600' }
                  case 'BILL_SPLIT':
                    return { Icon: Receipt, bgColor: 'bg-green-100', iconColor: 'text-green-600' }
                  case 'FRIENDLY_LOAN':
                    return { Icon: Banknote, bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' }
                  case 'FREELANCE_JOB':
                    return { Icon: Briefcase, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' }
                  case 'SALE_DEPOSIT':
                    return { Icon: ShoppingBag, bgColor: 'bg-pink-100', iconColor: 'text-pink-600' }
                  default:
                    return { Icon: FileText, bgColor: 'bg-gray-100', iconColor: 'text-gray-600' }
                }
              }
              const { Icon, bgColor, iconColor } = getTemplateStyle(contract.templateType)

              return (
                <div
                  key={contract.id}
                  onClick={() => handleContractClick(contract)}
                  className="p-4 hover:bg-gray-50 hover:shadow-md cursor-pointer flex items-center gap-3 transition-all duration-200"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgColor}`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-header text-sm truncate">{contract.name}</p>
                    <p className="text-xs text-body/50 truncate">
                      With: {contract.accepteeName || getUserById(contract.accepteeId)?.name || getUserById(contract.userId)?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-body/40">{formatDate(contract.signatureDate)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full text-white font-medium shrink-0
                    ${contract.status === 'Ongoing' ? 'bg-green-500' : ''}
                    ${contract.status === 'Pending' ? 'bg-orange-500' : ''}
                    ${contract.status === 'Completed' ? 'bg-blue-500' : ''}
                    ${contract.status === 'Breached' ? 'bg-red-500' : ''}
                    ${contract.status === 'Declined' ? 'bg-gray-400' : ''}
                  `}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse
                      ${contract.status === 'Ongoing' ? 'bg-green-300' : ''}
                      ${contract.status === 'Pending' ? 'bg-orange-300' : ''}
                      ${contract.status === 'Completed' ? 'bg-blue-300' : ''}
                      ${contract.status === 'Breached' ? 'bg-red-300' : ''}
                      ${contract.status === 'Declined' ? 'bg-gray-300' : ''}
                    `} />
                    {contract.status}
                  </span>
                </div>
              )
            })}
          </Card>
        ) : (
          <Card className="text-center py-8">
            <History className="h-12 w-12 text-body/30 mx-auto mb-3" />
            <p className="text-body/50">No recent activity</p>
          </Card>
        )}
      </div>

      {/* 6. Discussion & Meeting */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-header mb-4">Discussion & Meeting</h2>
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-surface rounded-xl p-4 shadow-sm cursor-pointer"
          >
            <MessageSquare className="h-6 w-6 text-purple-500 mb-2" />
            <p className="font-semibold text-header text-sm">Upcoming</p>
            <p className="text-xs text-body/40 italic">No upcoming discussions</p>
            <button className="text-xs text-primary mt-1 hover:underline">Schedule one?</button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-surface rounded-xl p-4 shadow-sm cursor-pointer"
          >
            <Calendar className="h-6 w-6 text-blue-500 mb-2" />
            <p className="font-semibold text-header text-sm">Schedule</p>
            <p className="text-xs text-body/50">Plan a meeting</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-surface rounded-xl p-4 shadow-sm cursor-pointer"
          >
            <History className="h-6 w-6 text-gray-500 mb-2" />
            <p className="font-semibold text-header text-sm">Past Meetings</p>
            <p className="text-xs text-body/40 italic">No past meetings</p>
            <button className="text-xs text-primary mt-1 hover:underline">View all?</button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 cursor-pointer shadow-md"
          >
            <PlayCircle className="h-6 w-6 text-white mb-2" />
            <p className="font-semibold text-white text-sm">Instant Meet</p>
            <p className="text-xs text-white/70">Start now</p>
          </motion.div>
        </div>
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
    </div >
  )
}

