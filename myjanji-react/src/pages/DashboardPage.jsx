import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Filter,
  Search,
  QrCode,
  Download,
  Eye,
  XCircle,
  RefreshCw,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useContracts } from '../context/ContractContext'
import { users } from '../utils/dummyData'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
import ContractCard from '../components/contracts/ContractCard'
import ContractList from '../components/contracts/ContractList'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import QRCodeDisplay from '../components/features/QRCodeDisplay'
import pdfService from '../services/pdfService'

// Base tabs - Declined will be added conditionally
const baseTabs = [
  { id: 'all', label: 'All', icon: FileText },
  { id: 'ongoing', label: 'Ongoing', icon: TrendingUp },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'breached', label: 'Breached', icon: AlertTriangle },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { currentUser, isAuthenticated, availableUsers } = useAuth()
  const { contracts, getAllContractsForUser, getPendingContractsForUser, stats, loadUserContracts } = useContracts()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState(null)

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

  // Filter contracts by tab, button filter, and search
  const filteredContracts = useMemo(() => {
    let filtered = userContracts

    // Filter by button click (Active, Pending, Issues)
    if (activeFilter) {
      const filterMap = {
        active: 'Ongoing',
        pending: 'Pending',
        issues: 'Breached',
      }
      filtered = filtered.filter((c) => c.status === filterMap[activeFilter])
    } else {
      // Filter by tab if no button filter is active
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
  }, [userContracts, activeTab, activeFilter, searchQuery])

  // Calculate stats for current user
  const userStats = useMemo(() => {
    const total = userContracts.length
    const ongoing = userContracts.filter((c) => c.status === 'Ongoing').length
    const pending = userContracts.filter((c) => c.status === 'Pending').length
    const breached = userContracts.filter((c) => c.status === 'Breached').length
    const declined = userContracts.filter((c) => c.status === 'Declined').length
    return { total, ongoing, pending, breached, declined }
  }, [userContracts])

  // Create dynamic tabs that include Declined only if count > 0
  const visibleTabs = useMemo(() => {
    const tabs = [...baseTabs]

    // Only add Declined tab if user has declined contracts
    if (userStats.declined > 0) {
      tabs.push({ id: 'declined', label: 'Declined', icon: XCircle })
    }

    return tabs
  }, [userStats.declined])

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
    // Navigate to create contract with pre-filled data
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

  const handleFilterClick = (filterType) => {
    // If clicking Total, clear all filters
    if (filterType === 'total') {
      setActiveFilter(null)
      setActiveTab('all')
    } else {
      // Toggle filter - if clicking the same filter, reset to all
      if (activeFilter === filterType) {
        setActiveFilter(null)
        setActiveTab('all')
      } else {
        setActiveFilter(filterType)
        setActiveTab('all') // Reset tab when using button filter
      }
    }
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="MyJanji" showLogout />

      {/* Generic MyKad Card */}
      <div className="px-4 -mt-4 relative z-10">
        <Card className="relative overflow-hidden" padding="none">
          {/* MyKad-style card design */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <div className="flex items-center gap-4">
              {/* Generic card icon */}
              <div className="w-16 h-20 bg-white rounded-lg border-2 border-blue-200 flex items-center justify-center shadow-sm">
                <CreditCard className="h-8 w-8 text-blue-400" />
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-header truncate text-lg">{currentUser.name}</h2>
                <p className="text-sm text-body/60 mt-1">IC: {currentUser.ic}</p>
                <p className="text-xs text-body/40 mt-1">Malaysian Identity Card</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="px-4 mt-4 grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: userStats.total, color: 'bg-primary', icon: FileText, filterType: 'total' },
          { label: 'Active', value: userStats.ongoing, color: 'bg-status-ongoing', icon: TrendingUp, filterType: 'active' },
          { label: 'Pending', value: userStats.pending, color: 'bg-status-pending', icon: Clock, filterType: 'pending' },
          { label: 'Issues', value: userStats.breached, color: 'bg-status-breached', icon: AlertTriangle, filterType: 'issues' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleFilterClick(stat.filterType)}
            className={`bg-surface rounded-xl p-3 card-shadow text-center cursor-pointer transition-all ${(stat.filterType === 'total' && !activeFilter) || activeFilter === stat.filterType ? 'ring-2 ring-primary' : ''
              }`}
          >
            <div className={`${stat.color} w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-xl font-bold text-header">{stat.value}</p>
            <p className="text-xs text-body/50">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Pending Contracts for Signing - Only show for Ultraman after contract creation */}
      {currentUser.id === 'USER-002' && pendingForSigning.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-header">Awaiting Your Signature</h3>
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
                    <p className="text-xs text-body/50">From: {users[contract.userId]?.name}</p>
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
      )}

      {/* Search Bar */}
      <div className="px-4 mt-6">
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
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setActiveFilter(null) // Reset button filter when clicking tab
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${activeTab === tab.id && !activeFilter
                  ? 'gradient-primary text-white'
                  : 'bg-surface text-body/60 hover:text-body card-shadow'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'declined' && userStats.declined > 0 && (
                <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                  {userStats.declined}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contract List */}
      <div className="px-4 mt-4">
        <ContractList
          contracts={filteredContracts}
          onContractClick={handleContractClick}
          emptyMessage={
            searchQuery
              ? `No contracts matching "${searchQuery}"`
              : `No ${activeTab === 'all' ? '' : activeTab} contracts`
          }
        />
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
                  {users[selectedContract.userId]?.name || 'Unknown'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-body/50 mb-1">Acceptee</p>
                <p className="font-medium text-header text-sm">
                  {users[selectedContract.accepteeId]?.name || 'Unknown'}
                </p>
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
            <div className="flex gap-3 pt-4 border-t border-gray-100">
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
    </div>
  )
}

