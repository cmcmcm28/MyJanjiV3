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
  XCircle,
  Filter,
  QrCode,
  Download,
  Eye,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useContracts } from '../context/ContractContext'
import { users } from '../utils/dummyData'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
import ContractList from '../components/contracts/ContractList'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import QRCodeDisplay from '../components/features/QRCodeDisplay'
import pdfService from '../services/pdfService'

const statusTabs = [
  { id: 'all', label: 'All', icon: FileText },
  { id: 'ongoing', label: 'Ongoing', icon: TrendingUp },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'breached', label: 'Breached', icon: AlertTriangle },
]

export default function ContractsPage() {
  const navigate = useNavigate()
  const { currentUser, isAuthenticated } = useAuth()
  const { contracts, getAllContractsForUser, loadUserContracts } = useContracts()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)

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
    const creator = users[contract.userId]
    const acceptee = users[contract.accepteeId]
    await pdfService.downloadContractPDF(contract, creator, acceptee)
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Contracts" showLogout />

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

