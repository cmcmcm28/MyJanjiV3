import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User,
  CreditCard,
  Mail,
  Phone,
  Edit,
  Shield,
  FileText,
  Settings,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useContracts } from '../context/ContractContext'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { currentUser, isAuthenticated } = useAuth()
  const { getAllContractsForUser, contracts } = useContracts()

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login')
    }
  }, [isAuthenticated, currentUser, navigate])

  if (!currentUser) return null

  const userContracts = getAllContractsForUser(currentUser.id)
  const stats = {
    total: userContracts.length,
    ongoing: userContracts.filter((c) => c.status === 'Ongoing').length,
    completed: userContracts.filter((c) => c.status === 'Completed').length,
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profile" showLogout />

      {/* Profile Header */}
      <div className="px-4 mt-4">
        <Card padding="lg" className="text-center">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-block mb-4"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-primary/20"
            />
          </motion.div>
          <h2 className="text-2xl font-bold text-header mb-1">{currentUser.name}</h2>
          <p className="text-body/60">Digital Contract User</p>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-2">
          <Card padding="md" className="text-center">
            <p className="text-2xl font-bold text-header">{stats.total}</p>
            <p className="text-xs text-body/50 mt-1">Total</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-2xl font-bold text-status-ongoing">{stats.ongoing}</p>
            <p className="text-xs text-body/50 mt-1">Active</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-2xl font-bold text-status-completed">{stats.completed}</p>
            <p className="text-xs text-body/50 mt-1">Done</p>
          </Card>
        </div>
      </div>

      {/* Personal Information */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-bold text-header mb-3">Personal Information</h3>
        <Card padding="md">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-body/50">IC Number</p>
                <p className="font-medium text-header">{currentUser.ic}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-body/50">Email</p>
                <p className="font-medium text-header">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-body/50">Phone</p>
                <p className="font-medium text-header">{currentUser.phone}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Security & Verification */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-bold text-header mb-3">Security & Verification</h3>
        <Card padding="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-header">Identity Verified</p>
                  <p className="text-xs text-body/50">Face recognition enabled</p>
                </div>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                Verified
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-header">Digital Signature</p>
                  <p className="text-xs text-body/50">Biometric signature enabled</p>
                </div>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                Active
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="px-4 mt-6 space-y-3">
        <Button
          fullWidth
          variant="outline"
          icon={Edit}
          onClick={() => {
            // Navigate to edit profile page if exists
            alert('Edit profile feature coming soon!')
          }}
        >
          Edit Profile
        </Button>
        <Button
          fullWidth
          variant="outline"
          icon={Settings}
          onClick={() => navigate('/settings')}
        >
          Settings
        </Button>
      </div>

      <BottomNav />
    </div>
  )
}

