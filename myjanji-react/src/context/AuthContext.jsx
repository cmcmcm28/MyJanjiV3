import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { users } from '../utils/dummyData'
import { userService } from '../services/supabase/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isFaceVerified, setIsFaceVerified] = useState(false)
  const [availableUsers, setAvailableUsers] = useState(Object.values(users))
  const [loading, setLoading] = useState(true)

  // Load available users from Supabase on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await userService.getAllUsers()
        if (!error && data && data.length > 0) {
          // Transform Supabase users to match frontend structure
          const transformed = data.map(user => ({
            id: user.user_id,
            name: user.name,
<<<<<<< HEAD
            ic: user.user_id || '', // Use user_id as IC
            nfcChipId: user.nfc_chip_id || null,
=======
            ic: user.user_id || '', // user_id stores the IC number
>>>>>>> 4985f905e2259792c983f116cd1eb4a2b3ea6f1a
            avatar: user.avatar || '/images/default-avatar.png',
            email: user.email || '',
            phone: user.phone || '',
          }))
          setAvailableUsers(transformed)
        } else {
          // Fallback to dummy data if Supabase fails or no users
          setAvailableUsers(Object.values(users))
        }
      } catch (error) {
        console.error('Error loading users:', error)
        setAvailableUsers(Object.values(users))
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [])

  const login = useCallback(async (userId) => {
    try {
      // Try to get user from Supabase
      const { data: supabaseUser, error } = await userService.getProfile(userId)

      if (!error && supabaseUser) {
        // Transform Supabase user to match frontend structure
        const user = {
          id: supabaseUser.user_id,
          name: supabaseUser.name,
<<<<<<< HEAD
          ic: supabaseUser.user_id || '',
          nfcChipId: supabaseUser.nfc_chip_id || null,
=======
          ic: supabaseUser.user_id || '', // user_id stores the IC number
>>>>>>> 4985f905e2259792c983f116cd1eb4a2b3ea6f1a
          avatar: supabaseUser.avatar || '/images/default-avatar.png',
          email: supabaseUser.email || '',
          phone: supabaseUser.phone || '',
        }
        setCurrentUser(user)
        setIsAuthenticated(true)
        return true
      } else {
        // Fallback to dummy data
        const user = users[userId]
        if (user) {
          setCurrentUser(user)
          setIsAuthenticated(true)
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      // Fallback to dummy data
      const user = users[userId]
      if (user) {
        setCurrentUser(user)
        setIsAuthenticated(true)
        return true
      }
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setCurrentUser(null)
    setIsAuthenticated(false)
    setIsFaceVerified(false)
  }, [])

  const verifyFace = useCallback(() => {
    setIsFaceVerified(true)
  }, [])

  const resetFaceVerification = useCallback(() => {
    setIsFaceVerified(false)
  }, [])

  const value = {
    currentUser,
    isAuthenticated,
    isFaceVerified,
    login,
    logout,
    verifyFace,
    resetFaceVerification,
    availableUsers,
    loading,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext

