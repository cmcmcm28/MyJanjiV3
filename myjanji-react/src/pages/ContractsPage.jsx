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
  XCircle,
  Filter,
  QrCode,
  Download,
  Eye,
  RefreshCw,
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
  const { t } = useTranslation()
  const { currentUser, isAuthenticated, availableUsers } = useAuth()
  const { contracts, getAllContractsForUser, loadUserContracts, loading } = useContracts()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)

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

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: userContracts.length,
      ongoing: userContracts.filter((c) => c.status === 'Ongoing').length,
      pending: userContracts.filter((c) => c.status === 'Pending').length,
      completed: userContracts.filter((c) => c.status === 'Completed').length,
      breached: userContracts.filter((c) => c.status === 'Breached').length,
    }
  }, [userContracts])

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

      {/* Stats Summary */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-body/50">Total</p>
                <p className="text-xl font-bold text-header">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-ongoing/10">
                <TrendingUp className="h-5 w-5 text-status-ongoing" />
              </div>
              <div>
                <p className="text-xs text-body/50">Active</p>
                <p className="text-xl font-bold text-header">{stats.ongoing}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

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
    </div>
  )
}

