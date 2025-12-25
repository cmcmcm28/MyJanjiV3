import { createContext, useContext, useState, useCallback } from 'react'
import { users } from '../utils/dummyData'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [allUsers] = useState(users)
  const [notifications, setNotifications] = useState([])

  const getUserById = useCallback((userId) => {
    return allUsers[userId] || null
  }, [allUsers])

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification,
    }
    setNotifications(prev => [newNotification, ...prev])
  }, [])

  const markNotificationRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const value = {
    users: allUsers,
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    getUserById,
    addNotification,
    markNotificationRead,
    clearNotifications,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUsers() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUsers must be used within a UserProvider')
  }
  return context
}

export default UserContext

