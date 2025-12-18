import { createContext, useContext, useState, useCallback } from 'react'
import { users } from '../utils/dummyData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isFaceVerified, setIsFaceVerified] = useState(false)

  const login = useCallback((userId) => {
    const user = users[userId]
    if (user) {
      setCurrentUser(user)
      setIsAuthenticated(true)
      return true
    }
    return false
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
    availableUsers: Object.values(users),
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

