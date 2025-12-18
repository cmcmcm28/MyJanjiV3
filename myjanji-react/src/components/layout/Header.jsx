import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, ArrowLeft, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Header({
  title = 'MyJanji',
  showBack = false,
  showNotifications = true,
  showLogout = false,
  rightContent,
}) {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
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
          {rightContent}
          
          {showNotifications && (
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors relative">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-status-breached rounded-full" />
            </button>
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
  )
}

