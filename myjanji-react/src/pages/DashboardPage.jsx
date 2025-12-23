import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

// Helper to get greeting based on time
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Selamat Pagi'
  if (hour < 18) return 'Selamat Petang'
  return 'Selamat Malam'
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
  const { currentUser, isAuthenticated, availableUsers } = useAuth()
  const { contracts, getAllContractsForUser, getPendingContractsForUser, stats, loadUserContracts } = useContracts()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

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
            {getGreeting()}, <span className="text-primary">{currentUser.name?.split(' ')[0]}</span>.
          </h1>
          <p className="text-body/60 text-sm mt-1">Manage your agreements efficiently</p>
        </motion.div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-body/40" />
          <input
            type="text"
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface rounded-xl pl-10 pr-4 py-3 text-body placeholder:text-body/40 card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
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
      </div >

      {/* 2. Agreement Summary */}
      < div className="px-4 mt-6" >
        <h2 className="text-lg font-bold text-header mb-3">Agreement Summary</h2>
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/contracts?filter=ongoing')}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 cursor-pointer"
          >
            <TrendingUp className="h-6 w-6 text-white/80 mb-2" />
            <p className="text-2xl font-bold text-white">{userStats.ongoing}</p>
            <p className="text-xs text-white/80">Active</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/contracts?filter=pending')}
            className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 cursor-pointer"
          >
            <Clock className="h-6 w-6 text-white/80 mb-2" />
            <p className="text-2xl font-bold text-white">{userStats.pending}</p>
            <p className="text-xs text-white/80">Pending</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/contracts?filter=completed')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 cursor-pointer"
          >
            <CheckCircle className="h-6 w-6 text-white/80 mb-2" />
            <p className="text-2xl font-bold text-white">{userStats.completed}</p>
            <p className="text-xs text-white/80">Completed</p>
          </motion.div>
        </div>
      </div >

      {/* 3. Upcoming Deadlines */}
      {
        upcomingDeadlines.length > 0 && (
          <div className="px-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-header">Upcoming Deadlines</h2>
              <button
                onClick={() => navigate('/contracts')}
                className="text-sm text-primary flex items-center gap-1"
              >
                View All <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines.map((contract) => {
                const daysLeft = getDaysUntil(contract.dueDate)
                return (
                  <motion.div
                    key={contract.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handleContractClick(contract)}
                    className={`bg-surface rounded-xl p-4 card-shadow cursor-pointer border-l-4 ${daysLeft <= 3 ? 'border-red-500' : daysLeft <= 7 ? 'border-amber-500' : 'border-green-500'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-header">{contract.name}</p>
                        <p className="text-xs text-body/50">{contract.topic}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${daysLeft <= 3 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-green-500'
                          }`}>
                          {daysLeft} days
                        </p>
                        <p className="text-xs text-body/50">{formatDate(contract.dueDate)}</p>
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-header">Awaiting Your Signature</h2>
              <span className="text-xs bg-status-pending/10 text-status-pending px-2 py-1 rounded-full font-medium">
                {pendingForSigning.length} pending
              </span>
            </div>
            <div className="space-y-2">
              {pendingForSigning.slice(0, 2).map((contract) => (
                <motion.div
                  key={contract.id}
                  whileHover={{ scale: 1.01 }}
                  className="bg-surface rounded-xl p-4 card-shadow border-l-4 border-status-pending"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-header">{contract.name}</p>
                      <p className="text-xs text-body/50">
                        From: {contract.creatorName || getUserById(contract.userId)?.name || 'Unknown'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSignContract(contract)}
                    >
                      Sign Now
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-header">Recent Activity</h2>
          <button
            onClick={() => navigate('/contracts')}
            className="text-sm text-primary flex items-center gap-1"
          >
            View All <ChevronRight className="h-4 w-4" />
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
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgColor}`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-header text-sm truncate">{contract.name}</p>
                    <p className="text-xs text-body/50 truncate">{contract.topic}</p>
                    <p className="text-xs text-body/40">{formatDate(contract.signatureDate)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full text-white shrink-0
                    ${contract.status === 'Ongoing' ? 'bg-status-ongoing' : ''}
                    ${contract.status === 'Pending' ? 'bg-status-pending' : ''}
                    ${contract.status === 'Completed' ? 'bg-status-completed' : ''}
                    ${contract.status === 'Breached' ? 'bg-status-breached' : ''}
                  `}>
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

      {/* 5. Quick Action Shortcuts */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-header mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/create-contract')}
            className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 cursor-pointer"
          >
            <Plus className="h-8 w-8 text-white mb-2" />
            <p className="font-bold text-white">New Contract</p>
            <p className="text-xs text-white/70">Create a new agreement</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/contracts')}
            className="bg-surface rounded-xl p-4 card-shadow cursor-pointer"
          >
            <Search className="h-8 w-8 text-primary mb-2" />
            <p className="font-bold text-header">Search Contract</p>
            <p className="text-xs text-body/50">Find existing agreements</p>
          </motion.div>
        </div>
      </div>

      {/* 6. Discussion & Meeting */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-header mb-3">Discussion & Meeting</h2>
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-surface rounded-xl p-4 card-shadow cursor-pointer"
          >
            <MessageSquare className="h-6 w-6 text-purple-500 mb-2" />
            <p className="font-semibold text-header text-sm">Upcoming</p>
            <p className="text-xs text-body/50">0 discussions</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-surface rounded-xl p-4 card-shadow cursor-pointer"
          >
            <Calendar className="h-6 w-6 text-blue-500 mb-2" />
            <p className="font-semibold text-header text-sm">Schedule</p>
            <p className="text-xs text-body/50">Plan a meeting</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-surface rounded-xl p-4 card-shadow cursor-pointer"
          >
            <History className="h-6 w-6 text-gray-500 mb-2" />
            <p className="font-semibold text-header text-sm">Past Meetings</p>
            <p className="text-xs text-body/50">View history</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 cursor-pointer"
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
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className={`
                inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white
                ${selectedContract.status === 'Ongoing' ? 'bg-status-ongoing' : ''}
                ${selectedContract.status === 'Pending' ? 'bg-status-pending' : ''}
                ${selectedContract.status === 'Completed' ? 'bg-status-completed' : ''}
                ${selectedContract.status === 'Breached' ? 'bg-status-breached' : ''}
                ${selectedContract.status === 'Declined' ? 'bg-gray-500' : ''}
              `}>
                {selectedContract.status}
              </span>
              <span className="text-sm font-mono text-body/50">{selectedContract.id}</span>
            </div>

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

            {/* Contract Info */}
            <div>
              <h3 className="text-xl font-bold text-header">{selectedContract.name}</h3>
              <p className="text-body/60">{selectedContract.topic}</p>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-body/50 mb-1">Creator</p>
                <p className="font-medium text-header text-sm">
                  {selectedContract.creatorName || getUserById(selectedContract.userId)?.name || 'Unknown'}
                </p>
                {selectedContract.creatorEmail && (
                  <p className="text-xs text-body/50 truncate">{selectedContract.creatorEmail}</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-body/50 mb-1">Acceptee</p>
                <p className="font-medium text-header text-sm">
                  {selectedContract.accepteeName || getUserById(selectedContract.accepteeId)?.name || 'Unknown'}
                </p>
                {selectedContract.accepteeEmail && (
                  <p className="text-xs text-body/50 truncate">{selectedContract.accepteeEmail}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-body/50 mb-1">Signature Date</p>
                <p className="font-medium text-header">
                  {selectedContract.signatureDate?.toLocaleDateString('en-MY') || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-body/50 mb-1">Due Date</p>
                <p className="font-medium text-header">
                  {selectedContract.dueDate?.toLocaleDateString('en-MY') || 'N/A'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
              {selectedContract.pdfUrl && (
                <Button
                  variant="outline"
                  icon={Eye}
                  onClick={() => window.open(selectedContract.pdfUrl, '_blank')}
                >
                  View PDF
                </Button>
              )}
              <Button
                variant="outline"
                icon={QrCode}
                onClick={() => {
                  setShowDetailsModal(false)
                  handleViewQR(selectedContract)
                }}
              >
                View QR
              </Button>
              <Button
                variant="outline"
                icon={Download}
                onClick={() => handleDownloadPDF(selectedContract)}
              >
                Download PDF
              </Button>
              {selectedContract.status === 'Pending' && selectedContract.accepteeId === currentUser.id && (
                <Button
                  icon={FileText}
                  onClick={() => handleSignContract(selectedContract)}
                >
                  Sign Contract
                </Button>
              )}
              {selectedContract.status === 'Declined' && selectedContract.userId === currentUser.id && (
                <Button
                  variant="outline"
                  icon={RefreshCw}
                  onClick={() => {
                    setShowDetailsModal(false)
                    handleResendContract(selectedContract)
                  }}
                >
                  Resend Contract
                </Button>
              )}
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

