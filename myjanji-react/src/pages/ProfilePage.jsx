import { useEffect, useState } from 'react'
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
  Star,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useContracts } from '../context/ContractContext'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Gauge from '../components/ui/Gauge'
import Timeline from '../components/ui/Timeline'
import { calculateTrustScore, getTrustScoreColor, getContractStats, formatTrustScore } from '../utils/trustScore'
import { useTranslation } from 'react-i18next'

export default function ProfilePage() {
  const { t } = useTranslation()
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
    expired: userContracts.filter((c) => c.status === 'Expired').length,
    breached: userContracts.filter((c) => c.status === 'Breached').length,
  }

  // Calculate trust score
  const trustScore = calculateTrustScore(stats)
  const trustColors = getTrustScoreColor(trustScore)

  // Tabs state
  const [activeTab, setActiveTab] = useState('Activity')
  const tabs = [t('profile.tabs.activity'), t('profile.tabs.payments')]

  // Handle Tab Change (map UI label back to internal key if needed, or better yet use keys for logic)
  // For simplicity, we'll just check against the translated string or maintain an index context. 
  // Let's stick to using the string for now but be aware if language changes while on a tab.
  // Ideally, use keys for state: 'activity', 'payments'

  // Re-map internal keys to display labels
  const tabKeys = ['activity', 'payments']
  // We'll trust the index or map based on activeTab. 
  // Actually, simpler: keep activeTab as key, render via t()

  // Refactor activeTab to store key instead of display label
  const [activeTabKey, setActiveTabKey] = useState('activity')

  // Generate activities from contracts (mock logic for demo)
  const activities = userContracts.slice(0, 5).map((contract, index) => {
    const dates = [
      contract.signatureDate ? new Date(contract.signatureDate) : new Date(),
      contract.dueDate ? new Date(contract.dueDate) : new Date()
    ]
    const dateStr = dates[0].toLocaleDateString('en-US', { hour: 'numeric', minute: 'numeric', month: 'short', day: 'numeric', year: 'numeric' })

    // Alternate some types for demo variety
    const types = ['contract_signed', 'contract_created', 'payment', 'email']
    const type = types[index % types.length]

    let title = `Contract Action`
    let description = ''

    if (type === 'contract_signed') {
      title = 'Signed Contract'
      description = `Signed agreement for `
    } else if (type === 'payment') {
      title = 'Payment Received'
      description = 'Payment of $150.00 made towards '
    } else if (type === 'contract_created') {
      title = 'Created New Contract'
      description = 'Initiated new draft for '
    } else {
      title = 'Email Sent'
      description = 'Reminder sent regarding '
    }

    return {
      type,
      date: dateStr,
      title: title,
      description: description,
      boldText: contract.name
    }
  })

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profile" showLogout />

      {/* Profile Header */}
      <div className="px-4 mt-6">
        <Card padding="lg" className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
            {/* Left: Avatar & Info */}
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-24 h-24 rounded-full object-cover relative border-4 border-surface shadow-xl"
                />
                <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-surface ${currentUser ? 'bg-green-500' : 'bg-gray-400'}`} />
              </motion.div>

              <div>
                <h2 className="text-3xl font-bold text-header mb-1">{currentUser.name}</h2>
                <p className="text-body/60 flex items-center justify-center md:justify-start gap-2">
                  <span>{t('profile.digitalContractUser')}</span>
                  <span className="w-1 h-1 rounded-full bg-body/30" />
                  <span>{currentUser.location || 'Malaysia'}</span>
                </p>

                <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
                  <div className="px-3 py-1 rounded-full bg-surface-hover border border-border/50 text-xs font-medium text-body/70">
                    {t('profile.joined')} Mar 2024
                  </div>
                  <div className="px-3 py-1 rounded-full bg-surface-hover border border-border/50 text-xs font-medium text-body/70">
                    {t('profile.verifiedId')}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Trust Score */}
            <div className="flex flex-col items-center md:items-end">
              <p className="text-sm font-medium text-body/50 mb-2 uppercase tracking-wider">{t('profile.trustScore')}</p>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${star <= Math.round(trustScore) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${trustColors.bg}`}>
                <span className={`text-lg font-bold ${trustColors.text}`}>
                  {formatTrustScore(trustScore)}
                </span>
                <span className={`text-sm font-medium ${trustColors.text}`}>
                  / 5.0
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Contract Status - Gauges */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-bold text-header mb-4 px-2">{t('profile.contractStatus')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="none" className="py-6">
            <Gauge
              value={stats.pending || 0}
              max={Math.max(stats.total, 10)}
              label={t('profile.status.pending')}
              color="text-yellow-500"
              bgColor="text-yellow-100"
            />
          </Card>
          <Card padding="none" className="py-6">
            <Gauge
              value={stats.ongoing || 0}
              max={Math.max(stats.total, 10)}
              label={t('profile.status.ongoing')}
              color="text-blue-500"
              bgColor="text-blue-100"
            />
          </Card>
          <Card padding="none" className="py-6">
            <Gauge
              value={stats.completed || 0}
              max={Math.max(stats.total, 10)}
              label={t('profile.status.completed')}
              color="text-green-500"
              bgColor="text-green-100"
            />
          </Card>
          <Card padding="none" className="py-6">
            <Gauge
              value={stats.breached || 0}
              max={Math.max(stats.total, 10)}
              label={t('profile.status.broken')}
              color="text-red-500"
              bgColor="text-red-100"
            />
          </Card>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-4 mt-6 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-6 border-b border-gray-100 min-w-max px-2">
          {tabKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTabKey(key)}
              className={`
                pb-3 text-sm font-medium transition-colors relative
                ${activeTabKey === key ? 'text-primary' : 'text-body/50 hover:text-body/80'}
              `}
            >
              {t(`profile.tabs.${key}`)}
              {activeTabKey === key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 mt-6">
        <Card padding="lg">
          {activeTabKey === 'activity' ? (
            <Timeline activities={activities} />
          ) : (
            <div className="text-center py-12 text-body/50">
              <p className="mb-2">No data yet for {t(`profile.tabs.${activeTabKey}`)}</p>
              <p className="text-xs">Check back later for updates.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Personal Information */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-bold text-header mb-3">{t('profile.personalInfo')}</h3>
        <Card padding="md">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl icon-container">
                <CreditCard className="h-5 w-5 text-primary-mid" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-body/50">{t('profile.icNumber')}</p>
                <p className="font-medium text-header">{currentUser.ic}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl icon-container">
                <Mail className="h-5 w-5 text-primary-mid" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-body/50">{t('profile.email')}</p>
                <p className="font-medium text-header">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl icon-container">
                <Phone className="h-5 w-5 text-primary-mid" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-body/50">{t('profile.phone')}</p>
                <p className="font-medium text-header">{currentUser.phone}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Security & Verification */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-bold text-header mb-3">{t('profile.securityVerification')}</h3>
        <Card padding="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-100 to-teal-50">
                  <Shield className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium text-header">{t('profile.identityVerified')}</p>
                  <p className="text-xs text-body/50">{t('profile.faceRecognitionEnabled')}</p>
                </div>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">
                {t('profile.verified')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl icon-container">
                  <FileText className="h-5 w-5 text-primary-mid" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium text-header">{t('profile.digitalSignature')}</p>
                  <p className="text-xs text-body/50">{t('profile.biometricSignatureEnabled')}</p>
                </div>
              </div>
              <span className="text-xs bg-primary-mid/10 text-primary-mid px-3 py-1.5 rounded-full font-medium">
                {t('profile.active')}
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
          {t('profile.editProfile')}
        </Button>
        <Button
          fullWidth
          variant="outline"
          icon={Settings}
          onClick={() => navigate('/settings')}
        >
          {t('profile.settings')}
        </Button>
      </div>

      <BottomNav />
    </div>
  )
}

