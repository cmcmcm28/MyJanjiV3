import { useEffect, useState, useMemo } from 'react'
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
  Eye,
  EyeOff,
  Download,
  Share2,
  Wallet,
  Building2,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  BadgeCheck,
  Sparkles,
  Plus,
  Link2,
  Clock,
  Wifi,
  Unlink,
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

  // State for IC visibility toggle
  const [showIC, setShowIC] = useState(false)
  
  // State for wallet card flip
  const [flippedCard, setFlippedCard] = useState(null)

  const userContracts = getAllContractsForUser(currentUser.id)
  const stats = {
    total: userContracts.length,
    ongoing: userContracts.filter((c) => c.status === 'Ongoing').length,
    completed: userContracts.filter((c) => c.status === 'Completed').length,
    pending: userContracts.filter((c) => c.status === 'Pending').length,
    expired: userContracts.filter((c) => c.status === 'Expired').length,
    breached: userContracts.filter((c) => c.status === 'Breached').length,
  }

  // Calculate trust score - DEMO: hardcode to 4.8 for presentation
  const rawTrustScore = calculateTrustScore(stats)
  const trustScore = 4.8 // Hardcoded for demo - shows "Good Citizen" profile
  const trustColors = getTrustScoreColor(trustScore)

  // Mask IC number
  const maskIC = (ic) => {
    if (!ic) return '***-****-****'
    const parts = ic.split('-')
    if (parts.length >= 3) {
      return `${parts[0]}-${parts[1]}-****`
    }
    // Fallback for different formats
    return ic.substring(0, 8) + '****'
  }

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

  // Generate activities from contracts with color-coded types and grouped by date
  const activities = useMemo(() => {
    const activityList = userContracts.slice(0, 8).map((contract, index) => {
      const date = contract.signatureDate ? new Date(contract.signatureDate) : new Date()
      const dateKey = date.toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })
      const timeStr = date.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })

      // Alternate types for demo variety
      const types = ['contract_signed', 'payment', 'contract_created', 'email', 'breach']
      const type = contract.status === 'Breached' ? 'breach' : types[index % 4]

      let title = 'Contract Action'
      let description = ''

      if (type === 'contract_signed') {
        title = 'Signed Contract'
        description = 'Successfully signed agreement for '
      } else if (type === 'payment') {
        title = 'Payment Received'
        description = 'Payment confirmed for '
      } else if (type === 'contract_created') {
        title = 'Created New Contract'
        description = 'Initiated new draft for '
      } else if (type === 'breach') {
        title = 'Contract Issue'
        description = 'Breach reported on '
      } else {
        title = 'Reminder Sent'
        description = 'Email reminder for '
      }

      return {
        type,
        dateKey,
        date: timeStr,
        title,
        description,
        boldText: contract.name
      }
    })

    return activityList
  }, [userContracts])

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profile" showLogout />

      {/* Profile Header - iOS Style with Gradient */}
      <div className="relative">
        {/* Gradient Header Background */}
        <div className="h-28 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700" />
        
        {/* Profile Card overlapping gradient */}
        <div className="px-4 -mt-16 relative z-10">
          <Card padding="lg" className="relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-2xl -mr-24 -mt-24 pointer-events-none" />

            <div className="flex items-start gap-4 relative z-10">
              {/* Avatar with Online Status */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative flex-shrink-0"
              >
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-110" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-2xl font-bold text-gray-500 relative border-4 border-white shadow-xl">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                  )}
                </div>
                {/* Online Indicator */}
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white shadow-sm" />
              </motion.div>

              {/* User Info Section */}
              <div className="flex-1 min-w-0 pt-1">
                {/* Name with Verified Badge - inline */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-header">{currentUser.name}</h2>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="relative"
                  >
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold tracking-wide">VERIFIED</span>
                    </div>
                  </motion.div>
                </div>
                
                {/* User Type & Location */}
                <p className="text-sm text-body/60 mt-0.5">
                  {t('profile.digitalContractUser')} • {currentUser.location || 'Malaysia'}
                </p>

                {/* Badges Row */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <div className="px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-[11px] font-medium text-body/70">
                    {t('profile.joined')} Mar 2024
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-[11px] font-medium text-green-700 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    MyKad Verified
                  </div>
                </div>
              </div>

              {/* Trust Score - Right Side */}
              <div className="flex flex-col items-end flex-shrink-0">
                <p className="text-[10px] font-semibold text-body/40 uppercase tracking-wider mb-1">
                  {t('profile.trustScore')}
                </p>
                {/* 5 Star Rating */}
                <div className="flex items-center gap-0.5 mb-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(trustScore) 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-200 fill-gray-100'
                      }`}
                    />
                  ))}
                </div>
                {/* Score Badge */}
                <div className={`flex items-baseline gap-1 px-2.5 py-1 rounded-lg ${trustColors.bg}`}>
                  <span className={`text-xl font-bold ${trustColors.text}`}>
                    {formatTrustScore(trustScore)}
                  </span>
                  <span className={`text-xs font-medium ${trustColors.text} opacity-70`}>
                    / 5.0
                  </span>
                </div>
                {/* View Report Link */}
                <button className="mt-2 text-[11px] text-primary hover:text-primary-dark flex items-center gap-1 transition-colors">
                  <FileText className="w-3 h-3" />
                  View Reputation Report
                </button>
              </div>
            </div>
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

      {/* Personal Information - 2 Column Layout */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-bold text-header mb-3">{t('profile.personalInfo')}</h3>
        <Card padding="md">
          <div className="grid grid-cols-2 gap-4">
            {/* IC Number with Mask Toggle */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl icon-container">
                <CreditCard className="h-5 w-5 text-primary-mid" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-body/50">{t('profile.icNumber')}</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-header truncate">
                    {showIC ? currentUser.ic : maskIC(currentUser.ic)}
                  </p>
                  <button
                    onClick={() => setShowIC(!showIC)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {showIC ? (
                      <EyeOff className="h-4 w-4 text-body/50" />
                    ) : (
                      <Eye className="h-4 w-4 text-body/50" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl icon-container">
                <Phone className="h-5 w-5 text-primary-mid" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-body/50">{t('profile.phone')}</p>
                <p className="font-medium text-header truncate">{currentUser.phone || '+60 12-345 6789'}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl icon-container">
                <Mail className="h-5 w-5 text-primary-mid" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-body/50">{t('profile.email')}</p>
                <p className="font-medium text-header truncate">{currentUser.email}</p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl icon-container">
                <Building2 className="h-5 w-5 text-primary-mid" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-body/50">Address</p>
                <p className="font-medium text-header truncate">{currentUser.address || 'Kuala Lumpur, Malaysia'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Digital Wallet - 3D Flip Cards */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-header">Digital Wallet</h3>
          <span className="text-xs text-body/50">Tap card to flip</span>
        </div>
        
        <div className="wallet-scroll-container">
          {/* Card 1: Black Mastercard - Primary */}
          <div 
            className={`wallet-card ${flippedCard === 'mastercard' ? 'flipped' : ''}`}
            onClick={() => setFlippedCard(flippedCard === 'mastercard' ? null : 'mastercard')}
          >
            <div className="wallet-card-inner">
              {/* Front */}
              <div className="wallet-card-front card-black p-3">
                {/* Top row: chip + contactless + logo */}
                <div className="flex items-start justify-between">
                  <div className="wallet-chip" />
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-white/60 rotate-90" />
                    <div className="mastercard-logo">
                      <div className="circle red" />
                      <div className="circle orange" />
                    </div>
                  </div>
                </div>
                
                {/* Card number */}
                <div className="mt-4 text-left">
                  <p className="text-[11px] font-mono tracking-widest text-white/80">•••• •••• •••• 4521</p>
                </div>
                
                {/* Bottom row: name + expiry */}
                <div className="mt-auto flex justify-between items-end">
                  <div className="text-left">
                    <p className="text-[8px] text-white/40 uppercase">Card Holder</p>
                    <p className="text-[10px] font-medium text-white uppercase tracking-wide">Ahmad Razif</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-white/40">Expires</p>
                    <p className="text-[10px] font-medium text-white">08/27</p>
                  </div>
                </div>
                
                {/* Primary badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-[8px] bg-green-500/90 text-white px-1.5 py-0.5 rounded-full font-medium">Primary</span>
                </div>
              </div>
              
              {/* Back */}
              <div className="wallet-card-back">
                <div className="wallet-strip" />
                <div className="flex flex-col gap-2 mt-2 px-1">
                  <button 
                    className="wallet-action-btn secondary"
                    onClick={(e) => { e.stopPropagation(); alert('View transaction history'); }}
                  >
                    <Clock className="w-3 h-3" />
                    View History
                  </button>
                  <button 
                    className="wallet-action-btn danger"
                    onClick={(e) => { e.stopPropagation(); alert('Unlink card?'); }}
                  >
                    <Unlink className="w-3 h-3" />
                    Unlink Card
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Card 2: Blue TnG eWallet */}
          <div 
            className={`wallet-card ${flippedCard === 'tng' ? 'flipped' : ''}`}
            onClick={() => setFlippedCard(flippedCard === 'tng' ? null : 'tng')}
          >
            <div className="wallet-card-inner">
              {/* Front */}
              <div className="wallet-card-front card-blue p-3">
                {/* Top row: TnG logo */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <span className="text-[8px] font-black text-blue-600">TnG</span>
                    </div>
                    <span className="text-[9px] font-bold text-white">eWallet</span>
                  </div>
                  <Wifi className="w-4 h-4 text-white/60 rotate-90" />
                </div>
                
                {/* Balance display */}
                <div className="mt-3 text-left">
                  <p className="text-[8px] text-white/60 uppercase">Balance</p>
                  <p className="text-lg font-bold text-white">RM 2,450<span className="text-xs">.80</span></p>
                </div>
                
                {/* Bottom row */}
                <div className="mt-auto flex justify-between items-end">
                  <div className="text-left">
                    <p className="text-[8px] text-white/60">Account</p>
                    <p className="text-[10px] font-medium text-white">•••• 8823</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[8px] text-white/80">Auto-Debit ON</span>
                  </div>
                </div>
              </div>
              
              {/* Back */}
              <div className="wallet-card-back card-blue-back">
                <div className="flex flex-col gap-2 px-1">
                  <button 
                    className="wallet-action-btn primary"
                    onClick={(e) => { e.stopPropagation(); alert('Set as Primary'); }}
                  >
                    <Star className="w-3 h-3" />
                    Set Primary
                  </button>
                  <button 
                    className="wallet-action-btn secondary"
                    onClick={(e) => { e.stopPropagation(); alert('View transaction history'); }}
                  >
                    <Clock className="w-3 h-3" />
                    View History
                  </button>
                  <button 
                    className="wallet-action-btn danger"
                    onClick={(e) => { e.stopPropagation(); alert('Unlink wallet?'); }}
                  >
                    <Unlink className="w-3 h-3" />
                    Unlink
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Card 3: Add New Card */}
          <div className="wallet-card">
            <div className="wallet-card-inner">
              <div 
                className="wallet-card-front card-add flex items-center justify-center cursor-pointer"
                onClick={() => alert('Add new payment method')}
              >
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium">Add Card</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Verification - Simplified since badge is in header */}
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
              <div className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full shadow-sm">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{t('profile.verified')}</span>
              </div>
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
        {/* Export Profile / Trust Certificate - Primary CTA */}
        <Button
          fullWidth
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          icon={Download}
          onClick={() => {
            // Generate Trust Certificate PDF
            alert('Generating Trust Certificate PDF...')
          }}
        >
          <div className="flex flex-col items-start">
            <span>Export Trust Certificate</span>
            <span className="text-[10px] opacity-80 font-normal">Share your verified reputation</span>
          </div>
        </Button>

        {/* Secondary Actions Row */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${currentUser.name}'s MyJanji Profile`,
                  text: `Verified digital contract user with ${trustScore}/5.0 trust score`,
                  url: window.location.href
                })
              } else {
                navigator.clipboard.writeText(window.location.href)
                alert('Profile link copied to clipboard!')
              }
            }}
            className="flex flex-col items-center gap-1.5 p-3 bg-surface rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <Share2 className="h-5 w-5 text-primary" />
            <span className="text-xs text-body/70 font-medium">Share</span>
          </button>
          <button
            onClick={() => alert('Edit profile feature coming soon!')}
            className="flex flex-col items-center gap-1.5 p-3 bg-surface rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <Edit className="h-5 w-5 text-primary" />
            <span className="text-xs text-body/70 font-medium">Edit</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex flex-col items-center gap-1.5 p-3 bg-surface rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <Settings className="h-5 w-5 text-primary" />
            <span className="text-xs text-body/70 font-medium">Settings</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

