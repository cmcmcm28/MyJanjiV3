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

export default function EnforcementPage() {
  const navigate = useNavigate()
  const { currentUser, isAuthenticated } = useAuth()
  const { contracts, getAllContractsForUser, markAsBreached } = useContracts()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showBreachModal, setShowBreachModal] = useState(false)
  const [breachReason, setBreachReason] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login')
    }
  }, [isAuthenticated, currentUser, navigate])

  // Get user's active/ongoing contracts that can be flagged as breached
  const enforceableContracts = useMemo(() => {
    if (!currentUser) return []
    const userContracts = getAllContractsForUser(currentUser.id)
    // Only show Ongoing contracts that can be flagged as breached
    return userContracts.filter(c => c.status === 'Ongoing')
  }, [currentUser, getAllContractsForUser, contracts])

  // Filter contracts by search
  const filteredContracts = useMemo(() => {
    let filtered = enforceableContracts

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
  }, [enforceableContracts, searchQuery])

  const handleContractClick = (contract) => {
    setSelectedContract(contract)
    setShowBreachModal(true)
  }

  const handleMarkAsBreached = () => {
    if (!selectedContract) return
    markAsBreached(selectedContract.id, breachReason || 'Contract terms violated')
    setShowBreachModal(false)
    setBreachReason('')
    setSelectedContract(null)
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Enforcement" showLogout />

      {/* Info Card */}
      <div className="px-4 mt-4">
        <Card className="bg-orange-50 border-orange-200" padding="md">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Flag className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-1">Flag Contract Breach</h3>
              <p className="text-sm text-orange-700">
                Select an active or ongoing contract to flag it as breached if the other party has violated the terms.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-ongoing/10">
                <FileText className="h-5 w-5 text-status-ongoing" />
              </div>
              <div>
                <p className="text-xs text-body/50">Enforceable</p>
                <p className="text-xl font-bold text-header">{enforceableContracts.length}</p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-breached/10">
                <AlertTriangle className="h-5 w-5 text-status-breached" />
              </div>
              <div>
                <p className="text-xs text-body/50">Breached</p>
                <p className="text-xl font-bold text-header">
                  {contracts.filter(c => 
                    (c.userId === currentUser.id || c.accepteeId === currentUser.id) && 
                    c.status === 'Breached'
                  ).length}
                </p>
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

      {/* Contract List */}
      <div className="px-4 mt-4">
        {filteredContracts.length === 0 ? (
          <Card padding="lg" className="text-center">
            <FileText className="h-16 w-16 text-body/20 mx-auto mb-4" />
            <p className="text-body/60 font-medium">
              {searchQuery 
                ? `No contracts matching "${searchQuery}"`
                : 'No active contracts to enforce'}
            </p>
            <p className="text-sm text-body/40 mt-2">
              Only ongoing contracts can be flagged as breached
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredContracts.map((contract) => (
              <motion.div
                key={contract.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Card
                  padding="md"
                  className="cursor-pointer border-l-4 border-status-ongoing hover:shadow-lg transition-shadow"
                  onClick={() => handleContractClick(contract)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-header truncate">{contract.name}</h3>
                        <span className="text-xs bg-status-ongoing/10 text-status-ongoing px-2 py-0.5 rounded-full font-medium">
                          {contract.status}
                        </span>
                      </div>
                      <p className="text-sm text-body/60 truncate">{contract.topic}</p>
                      <p className="text-xs text-body/40 mt-1">
                        {contract.userId === currentUser.id 
                          ? `With: ${users[contract.accepteeId]?.name || 'Unknown'}`
                          : `From: ${users[contract.userId]?.name || 'Unknown'}`
                        }
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Flag}
                      className="ml-3"
                    >
                      Flag
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Breach Confirmation Modal */}
      <Modal
        isOpen={showBreachModal}
        onClose={() => {
          setShowBreachModal(false)
          setBreachReason('')
          setSelectedContract(null)
        }}
        title="Flag Contract as Breached"
        size="md"
      >
        {selectedContract && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 mb-1">Warning</p>
                  <p className="text-sm text-red-700">
                    Flagging this contract as breached is a serious action. This will change the contract status and may have legal implications.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-header mb-2">{selectedContract.name}</h3>
              <p className="text-sm text-body/60">{selectedContract.topic}</p>
              <p className="text-xs text-body/40 mt-2">
                Contract ID: {selectedContract.id}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-header mb-2">
                Reason for Breach (Optional)
              </label>
              <textarea
                value={breachReason}
                onChange={(e) => setBreachReason(e.target.value)}
                placeholder="Describe how the contract terms were violated..."
                className="w-full bg-surface rounded-xl p-3 text-body placeholder:text-body/40 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setShowBreachModal(false)
                  setBreachReason('')
                  setSelectedContract(null)
                }}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                icon={Flag}
                onClick={handleMarkAsBreached}
                className="bg-status-breached hover:bg-status-breached/90"
              >
                Flag as Breached
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <BottomNav />
    </div>
  )
}

