import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Bell,
  Shield,
  Lock,
  Moon,
  Globe,
  HelpCircle,
  Info,
  LogOut,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { currentUser, isAuthenticated, logout } = useAuth()
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [biometricEnabled, setBiometricEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)

  const currentLanguage = i18n.language

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang)
    setShowLanguageModal(false)
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login')
    }
  }, [isAuthenticated, currentUser, navigate])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleDeleteAccount = () => {
    // Implement account deletion logic
    alert('Account deletion feature coming soon!')
    setShowDeleteConfirm(false)
  }

  if (!currentUser) return null

  const settingsSections = [
    {
      title: t('settings.notifications'),
      items: [
        {
          icon: Bell,
          label: t('settings.pushNotifications'),
          description: t('settings.receiveNotifications'),
          value: notificationsEnabled,
          onChange: setNotificationsEnabled,
          type: 'toggle',
        },
      ],
    },
    {
      title: t('settings.security'),
      items: [
        {
          icon: Shield,
          label: t('settings.biometricAuth'),
          description: t('settings.useFaceRecognition'),
          value: biometricEnabled,
          onChange: setBiometricEnabled,
          type: 'toggle',
        },
        {
          icon: Lock,
          label: t('settings.changePassword'),
          description: t('settings.updatePassword'),
          type: 'action',
          onClick: () => alert('Change password feature coming soon!'),
        },
      ],
    },
    {
      title: t('settings.appearance'),
      items: [
        {
          icon: Moon,
          label: t('settings.darkMode'),
          description: t('settings.switchToDark'),
          value: darkMode,
          onChange: setDarkMode,
          type: 'toggle',
        },
        {
          icon: Globe,
          label: t('settings.language'),
          description: currentLanguage === 'bm' ? t('settings.malay') : t('settings.english'),
          type: 'action',
          onClick: () => setShowLanguageModal(true),
        },
      ],
    },
    {
      title: t('settings.dataPrivacy'),
      items: [
        {
          icon: Download,
          label: t('settings.exportData'),
          description: t('settings.downloadContractData'),
          type: 'action',
          onClick: () => alert('Data export feature coming soon!'),
        },
        {
          icon: Trash2,
          label: t('settings.deleteAccount'),
          description: t('settings.permanentlyDelete'),
          type: 'action',
          onClick: () => setShowDeleteConfirm(true),
          danger: true,
        },
      ],
    },
    {
      title: t('settings.support'),
      items: [
        {
          icon: HelpCircle,
          label: t('settings.helpCenter'),
          description: t('settings.getHelp'),
          type: 'action',
          onClick: () => alert('Help center coming soon!'),
        },
        {
          icon: Info,
          label: t('settings.about'),
          description: 'MyJanji v3.0.0',
          type: 'action',
          onClick: () => alert('MyJanji - Digital Contract Management Platform\nVersion 3.0.0'),
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t('settings.title')} showLogout />

      <div className="px-4 mt-4 space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-sm font-semibold text-body/60 mb-3 px-1">
              {section.title}
            </h3>
            <Card padding="none">
              {section.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className={`
                    flex items-center justify-between p-4
                    ${itemIndex !== section.items.length - 1 ? 'border-b border-gray-100' : ''}
                    ${item.type === 'action' ? 'cursor-pointer hover:bg-gray-50' : ''}
                  `}
                  onClick={item.onClick}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${item.danger ? 'bg-red-100' : 'bg-primary/10'
                      }`}>
                      <item.icon className={`h-5 w-5 ${item.danger ? 'text-red-600' : 'text-primary'
                        }`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${item.danger ? 'text-red-600' : 'text-header'
                        }`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-body/50">{item.description}</p>
                    </div>
                  </div>
                  {item.type === 'toggle' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        item.onChange(!item.value)
                      }}
                      className={`
                        relative w-12 h-6 rounded-full transition-colors
                        ${item.value ? 'bg-primary' : 'bg-gray-300'}
                      `}
                    >
                      <span
                        className={`
                          absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform
                          ${item.value ? 'translate-x-6' : 'translate-x-0'}
                        `}
                      />
                    </button>
                  )}
                  {item.type === 'action' && (
                    <span className="text-body/40">›</span>
                  )}
                </div>
              ))}
            </Card>
          </div>
        ))}

        {/* Logout Button */}
        <div className="pt-4">
          <Button
            fullWidth
            variant="outline"
            icon={LogOut}
            onClick={handleLogout}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            {t('settings.logout')}
          </Button>
        </div>
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-2xl p-6 max-w-sm w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-header">{t('settings.language')}</h3>
            </div>
            <div className="space-y-2 mb-6">
              <button
                onClick={() => changeLanguage('en')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border ${currentLanguage === 'en' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <span className="font-medium text-header">English</span>
                {currentLanguage === 'en' && <Check className="h-5 w-5 text-primary" />}
              </button>
              <button
                onClick={() => changeLanguage('bm')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border ${currentLanguage === 'bm' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <span className="font-medium text-header">Bahasa Melayu</span>
                {currentLanguage === 'bm' && <Check className="h-5 w-5 text-primary" />}
              </button>
            </div>
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowLanguageModal(false)}
            >
              {t('common.close')}
            </Button>
          </motion.div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-2xl p-6 max-w-sm w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-header">{t('settings.deleteAccount')}</h3>
            </div>
            <p className="text-body/60 mb-6">
              {t('settings.logoutConfirm')}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                fullWidth
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700"
              >
                {t('common.delete')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

