import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ArrowLeft, LogOut, Globe, X, Check, Trash2, FileText, ExternalLink } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'

export default function Header({
  title = 'MyJanji',
  showBack = false,
  showNotifications = true,
  showLogout = false,
  rightContent,
}) {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const { i18n } = useTranslation()
  const {
    notifications,
    unreadCount,
    isOpen,
    showToast,
    toggleOpen,
    close,
    dismissToast,
    markAsRead,
    markAllAsRead,
    removeNotification,
    getNotificationType,
    formatRelativeTime,
    setUserId,
  } = useNotifications()
  
  const dropdownRef = useRef(null)

  // Set user ID for notifications when user changes
  useEffect(() => {
    if (currentUser?.id) {
      setUserId(currentUser.id)
    }
  }, [currentUser?.id, setUserId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        close()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, close])

  const toggleLanguage = () => {
    console.log('Current language:', i18n.language)
    const currentLang = i18n.language || 'en'
    const newLang = currentLang.startsWith('en') ? 'bm' : 'en'
    console.log('Switching to:', newLang)
    i18n.changeLanguage(newLang)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNotificationClick = (notification, e) => {
    // Prevent triggering if clicking on action buttons
    if (e?.target?.closest('button')) return
    
    markAsRead(notification.id)
    close()
    
    if (notification.contractId) {
      // Navigate to contracts page with contract_id as search param
      navigate(`/contracts?contract_id=${notification.contractId}&open=true`)
    } else {
      // For notifications without contract, navigate based on type
      switch (notification.type) {
        case 'security_alert':
          navigate('/settings')
          break
        case 'payment_received':
        case 'payment_due':
          navigate('/profile')
          break
        default:
          navigate('/contracts')
      }
    }
  }

  // Priority indicator color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-amber-500'
      default: return 'bg-blue-500'
    }
  }

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="gradient-primary text-white sticky top-0 z-40"
      >
        <div className="flex items-center justify-between px-4 py-4">
          {/* Left section */}
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {currentUser && !showBack && (
                <p className="text-sm text-white/80">Welcome, {currentUser.name.split(' ')[0]}</p>
              )}
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/20"
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-bold tracking-wider">
                {i18n.language && i18n.language.startsWith('en') ? 'ENG' : 'BM'}
              </span>
            </button>

            {rightContent}

            {showNotifications && (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={toggleOpen}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-status-breached rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-primary notification-badge-pulse"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </button>

                {/* iOS 26 Style Notification Dropdown */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="ios-notification-dropdown absolute right-0 top-full mt-2 w-[360px] max-h-[520px] overflow-hidden rounded-3xl z-50"
                    >
                      {/* Frosted Glass Header */}
                      <div className="ios-dropdown-header px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-mid to-primary-end flex items-center justify-center">
                            <Bell className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-lg">Notifications</h3>
                            {unreadCount > 0 && (
                              <p className="text-xs text-white/60">{unreadCount} unread</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                              title="Mark all as read"
                            >
                              <Check className="w-5 h-5 text-white/70" />
                            </button>
                          )}
                          <button
                            onClick={close}
                            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <X className="w-5 h-5 text-white/70" />
                          </button>
                        </div>
                      </div>

                      {/* Notification List */}
                      <div className="ios-dropdown-body overflow-y-auto max-h-[400px] p-3 space-y-2">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-white/40">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                              <Bell className="w-8 h-8" />
                            </div>
                            <p className="text-sm font-medium">No notifications</p>
                            <p className="text-xs mt-1">You're all caught up!</p>
                          </div>
                        ) : (
                          notifications.map((notification, index) => {
                            const typeConfig = getNotificationType(notification.type)
                            const IconComponent = typeConfig.icon

                            return (
                              <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                whileHover={{ scale: 1.01, x: 4 }}
                                className={`ios-notification-card group cursor-pointer ${!notification.read ? 'unread' : ''}`}
                                style={{ '--card-bg': typeConfig.bgGlass }}
                                onClick={(e) => handleNotificationClick(notification, e)}
                              >
                                {/* Priority Indicator */}
                                {notification.priority === 'high' && !notification.read && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b from-red-400 to-red-600" />
                                )}

                                {/* Icon */}
                                <div className={`ios-notification-icon bg-gradient-to-br ${typeConfig.gradientFrom} ${typeConfig.gradientTo}`}>
                                  <IconComponent className="w-5 h-5 text-white" />
                                </div>

                                {/* Content */}
                                <div className="ios-notification-content">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="ios-notification-title">{notification.title}</h4>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {!notification.read && (
                                        <span className="w-2 h-2 bg-primary-end rounded-full animate-pulse" />
                                      )}
                                      <span className="ios-notification-time">{formatRelativeTime(notification.timestamp)}</span>
                                    </div>
                                  </div>
                                  <p className="ios-notification-message">{notification.message}</p>
                                  
                                  {/* Contract Link Indicator */}
                                  {notification.contractId && (
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-primary-end/80">
                                      <FileText className="w-3 h-3" />
                                      <span className="font-medium">Tap to view contract</span>
                                      <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
                                    </div>
                                  )}
                                </div>

                                {/* Delete button (on hover) */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeNotification(notification.id)
                                  }}
                                  className="absolute top-3 right-3 p-1.5 rounded-xl bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/40 hover:scale-110"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </motion.div>
                            )
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {showLogout && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <LogOut className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Toast Notification Popup */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="ios-toast-notification fixed top-20 left-1/2 z-50 w-[90%] max-w-[380px]"
            onClick={() => {
              if (showToast.contractId) {
                dismissToast()
                navigate('/contracts')
              }
            }}
          >
            {(() => {
              const typeConfig = getNotificationType(showToast.type)
              const IconComponent = typeConfig.icon
              return (
                <div className="ios-toast-content">
                  <div className={`ios-toast-icon bg-gradient-to-br ${typeConfig.gradientFrom} ${typeConfig.gradientTo}`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm">{showToast.title}</h4>
                    <p className="text-xs text-white/70 truncate">{showToast.message}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      dismissToast()
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

