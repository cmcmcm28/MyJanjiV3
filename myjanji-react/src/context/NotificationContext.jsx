import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { FileText, CheckCircle, AlertTriangle, Clock, CreditCard, Shield, Bell, XCircle, Calendar, UserPlus, Zap } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const NotificationContext = createContext(null)

// Notification types with their icons and colors
const NOTIFICATION_TYPES = {
  contract_signed: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    gradientFrom: 'from-green-400',
    gradientTo: 'to-emerald-600',
    bgGlass: 'rgba(16, 185, 129, 0.15)',
  },
  contract_pending: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    gradientFrom: 'from-amber-400',
    gradientTo: 'to-orange-500',
    bgGlass: 'rgba(245, 158, 11, 0.15)',
  },
  contract_breached: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    gradientFrom: 'from-red-400',
    gradientTo: 'to-red-600',
    bgGlass: 'rgba(239, 68, 68, 0.15)',
  },
  contract_declined: {
    icon: XCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500',
    gradientFrom: 'from-gray-400',
    gradientTo: 'to-gray-600',
    bgGlass: 'rgba(107, 114, 128, 0.15)',
  },
  payment_received: {
    icon: CreditCard,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-indigo-600',
    bgGlass: 'rgba(59, 130, 246, 0.15)',
  },
  payment_due: {
    icon: Calendar,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    gradientFrom: 'from-orange-400',
    gradientTo: 'to-red-500',
    bgGlass: 'rgba(249, 115, 22, 0.15)',
  },
  security_alert: {
    icon: Shield,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    gradientFrom: 'from-purple-400',
    gradientTo: 'to-violet-600',
    bgGlass: 'rgba(139, 92, 246, 0.15)',
  },
  reminder: {
    icon: Bell,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500',
    gradientFrom: 'from-cyan-400',
    gradientTo: 'to-teal-600',
    bgGlass: 'rgba(6, 182, 212, 0.15)',
  },
  new_contract: {
    icon: FileText,
    color: 'text-primary-mid',
    bgColor: 'bg-primary-mid',
    gradientFrom: 'from-primary-mid',
    gradientTo: 'to-blue-600',
    bgGlass: 'rgba(30, 86, 160, 0.15)',
  },
  new_user: {
    icon: UserPlus,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500',
    gradientFrom: 'from-teal-400',
    gradientTo: 'to-cyan-600',
    bgGlass: 'rgba(20, 184, 166, 0.15)',
  },
  contract_expiring: {
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    gradientFrom: 'from-yellow-400',
    gradientTo: 'to-amber-500',
    bgGlass: 'rgba(234, 179, 8, 0.15)',
  },
}

// Generate due date reminder notifications from contracts
const generateDueDateReminders = (contracts, userId) => {
  const reminders = []
  const now = new Date()
  
  contracts.forEach(contract => {
    if (!contract.due_date || contract.status === 'Completed' || contract.status === 'Breached') return
    
    const dueDate = new Date(contract.due_date)
    const diffTime = dueDate - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Only show reminders for contracts user is involved in
    if (contract.user_id !== userId && contract.acceptee_id !== userId) return
    
    if (diffDays <= 0) {
      // Overdue
      reminders.push({
        id: `reminder-overdue-${contract.contract_id}`,
        type: 'contract_breached',
        title: 'Contract Overdue!',
        message: `"${contract.contract_name}" was due ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`,
        timestamp: new Date(),
        read: false,
        contractId: contract.contract_id,
        priority: 'high',
      })
    } else if (diffDays === 1) {
      // Due tomorrow
      reminders.push({
        id: `reminder-tomorrow-${contract.contract_id}`,
        type: 'payment_due',
        title: 'Due Tomorrow!',
        message: `"${contract.contract_name}" is due tomorrow`,
        timestamp: new Date(),
        read: false,
        contractId: contract.contract_id,
        priority: 'high',
      })
    } else if (diffDays <= 3) {
      // Due in 3 days
      reminders.push({
        id: `reminder-3days-${contract.contract_id}`,
        type: 'contract_expiring',
        title: 'Due Soon',
        message: `"${contract.contract_name}" is due in ${diffDays} days`,
        timestamp: new Date(),
        read: false,
        contractId: contract.contract_id,
        priority: 'medium',
      })
    } else if (diffDays <= 7) {
      // Due in a week
      reminders.push({
        id: `reminder-week-${contract.contract_id}`,
        type: 'reminder',
        title: 'Upcoming Deadline',
        message: `"${contract.contract_name}" is due in ${diffDays} days`,
        timestamp: new Date(),
        read: true, // Don't mark as unread for week-out reminders
        contractId: contract.contract_id,
        priority: 'low',
      })
    }
  })
  
  return reminders
}

// Fallback demo notifications when Supabase not configured
const DEMO_NOTIFICATIONS = [
  {
    id: '1',
    type: 'contract_pending',
    title: 'New Contract Request',
    message: 'Sarah Ahmad sent you a Rental Agreement to sign',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    contractId: 'contract-001',
    priority: 'high',
  },
  {
    id: '2',
    type: 'payment_received',
    title: 'Payment Confirmed',
    message: 'RM 2,500 received from Ali Hassan for Freelance Contract',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
    contractId: 'contract-002',
    priority: 'medium',
  },
  {
    id: '3',
    type: 'contract_signed',
    title: 'Contract Completed',
    message: 'Both parties have signed the Service Agreement',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    read: true,
    contractId: 'contract-003',
    priority: 'low',
  },
]

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [showToast, setShowToast] = useState(null)

  // Count unread notifications
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length
  }, [notifications])

  // Fetch notifications from Supabase
  const fetchNotifications = useCallback(async (userId) => {
    if (!isSupabaseConfigured() || !userId) {
      setNotifications(DEMO_NOTIFICATIONS)
      return
    }

    try {
      // Fetch user's notifications from Supabase
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      // Fetch contracts to generate due date reminders
      const { data: contractData } = await supabase
        .from('contracts')
        .select('contract_id, contract_name, due_date, status, user_id, acceptee_id')
        .or(`user_id.eq.${userId},acceptee_id.eq.${userId}`)
        .in('status', ['Ongoing', 'Pending'])

      let allNotifications = []

      // Add fetched notifications
      if (!notifError && notifData) {
        allNotifications = notifData.map(n => ({
          id: n.notification_id,
          type: n.notification_type,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at),
          read: n.is_read,
          contractId: n.contract_id,
          priority: n.priority || 'medium',
        }))
      }

      // Generate and add due date reminders
      if (contractData) {
        const reminders = generateDueDateReminders(contractData, userId)
        // Filter out duplicates
        const existingIds = new Set(allNotifications.map(n => n.id))
        reminders.forEach(r => {
          if (!existingIds.has(r.id)) {
            allNotifications.push(r)
          }
        })
      }

      // Sort by timestamp
      allNotifications.sort((a, b) => b.timestamp - a.timestamp)

      setNotifications(allNotifications.length > 0 ? allNotifications : DEMO_NOTIFICATIONS)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications(DEMO_NOTIFICATIONS)
    }
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUserId) return

    // Subscribe to new notifications
    const notificationChannel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newNotif = {
            id: payload.new.notification_id,
            type: payload.new.notification_type,
            title: payload.new.title,
            message: payload.new.message,
            timestamp: new Date(payload.new.created_at),
            read: false,
            contractId: payload.new.contract_id,
            priority: payload.new.priority || 'high',
          }
          
          // Add to notifications
          setNotifications(prev => [newNotif, ...prev])
          
          // Show toast popup
          setShowToast(newNotif)
          setTimeout(() => setShowToast(null), 5000)
        }
      )
      .subscribe()

    // Subscribe to contract changes (for pending contracts)
    const contractChannel = supabase
      .channel('contracts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contracts',
          filter: `acceptee_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newNotif = {
            id: `new-contract-${payload.new.contract_id}`,
            type: 'new_contract',
            title: 'New Contract Received!',
            message: `You have a new "${payload.new.contract_name}" to review`,
            timestamp: new Date(),
            read: false,
            contractId: payload.new.contract_id,
            priority: 'high',
          }
          
          setNotifications(prev => [newNotif, ...prev])
          setShowToast(newNotif)
          setTimeout(() => setShowToast(null), 5000)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contracts',
        },
        (payload) => {
          // Only notify for status changes involving current user
          if (payload.new.user_id !== currentUserId && payload.new.acceptee_id !== currentUserId) return
          if (payload.old.status === payload.new.status) return

          let notifType = 'reminder'
          let title = 'Contract Updated'
          let message = `"${payload.new.contract_name}" status changed`

          switch (payload.new.status) {
            case 'Ongoing':
              notifType = 'contract_signed'
              title = 'Contract Signed!'
              message = `"${payload.new.contract_name}" is now active`
              break
            case 'Completed':
              notifType = 'contract_signed'
              title = 'Contract Completed'
              message = `"${payload.new.contract_name}" has been completed`
              break
            case 'Breached':
              notifType = 'contract_breached'
              title = 'Contract Breached!'
              message = `"${payload.new.contract_name}" has been marked as breached`
              break
            case 'Declined':
              notifType = 'contract_declined'
              title = 'Contract Declined'
              message = `"${payload.new.contract_name}" was declined`
              break
          }

          const newNotif = {
            id: `status-${payload.new.contract_id}-${Date.now()}`,
            type: notifType,
            title,
            message,
            timestamp: new Date(),
            read: false,
            contractId: payload.new.contract_id,
            priority: 'high',
          }
          
          setNotifications(prev => [newNotif, ...prev])
          setShowToast(newNotif)
          setTimeout(() => setShowToast(null), 5000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notificationChannel)
      supabase.removeChannel(contractChannel)
    }
  }, [currentUserId])

  // Set user ID from auth context
  const setUserId = useCallback((userId) => {
    setCurrentUserId(userId)
    if (userId) {
      fetchNotifications(userId)
    }
  }, [fetchNotifications])

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    )

    // Update in Supabase if configured
    if (isSupabaseConfigured() && !notificationId.startsWith('reminder-')) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('notification_id', notificationId)
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )

    // Update in Supabase
    if (isSupabaseConfigured() && currentUserId) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', currentUserId)
      } catch (error) {
        console.error('Error marking all as read:', error)
      }
    }
  }, [currentUserId])

  // Add a new notification (local + Supabase)
  const addNotification = useCallback(async (notification) => {
    const newNotification = {
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      read: false,
      priority: 'medium',
      ...notification,
    }
    
    setNotifications(prev => [newNotification, ...prev])

    // Also insert into Supabase
    if (isSupabaseConfigured() && currentUserId) {
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: currentUserId,
            notification_type: notification.type,
            title: notification.title,
            message: notification.message,
            contract_id: notification.contractId,
            priority: notification.priority || 'medium',
          })
      } catch (error) {
        console.error('Error adding notification:', error)
      }
    }

    // Show toast
    setShowToast(newNotification)
    setTimeout(() => setShowToast(null), 5000)
  }, [currentUserId])

  // Remove a notification
  const removeNotification = useCallback(async (notificationId) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    )

    if (isSupabaseConfigured() && !notificationId.startsWith('reminder-')) {
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('notification_id', notificationId)
      } catch (error) {
        console.error('Error removing notification:', error)
      }
    }
  }, [])

  // Clear all notifications
  const clearAll = useCallback(async () => {
    setNotifications([])

    if (isSupabaseConfigured() && currentUserId) {
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', currentUserId)
      } catch (error) {
        console.error('Error clearing notifications:', error)
      }
    }
  }, [currentUserId])

  // Toggle notification panel
  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  // Close notification panel
  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Dismiss toast
  const dismissToast = useCallback(() => {
    setShowToast(null)
  }, [])

  // Get notification type config
  const getNotificationType = useCallback((type) => {
    return NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.reminder
  }, [])

  // Format relative time
  const formatRelativeTime = useCallback((date) => {
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
  }, [])

  // Refresh due date reminders periodically
  useEffect(() => {
    if (!currentUserId) return

    const interval = setInterval(() => {
      fetchNotifications(currentUserId)
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [currentUserId, fetchNotifications])

  const value = {
    notifications,
    unreadCount,
    isOpen,
    showToast,
    setUserId,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAll,
    toggleOpen,
    close,
    dismissToast,
    getNotificationType,
    formatRelativeTime,
    refreshNotifications: () => fetchNotifications(currentUserId),
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
