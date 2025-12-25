import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Home, FileText, PlusCircle, User, Flag } from 'lucide-react'

const navItems = [
  { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
  { path: '/contracts', icon: FileText, labelKey: 'nav.contracts' },
  { path: '/create-contract', icon: PlusCircle, labelKey: 'nav.create', isMain: true },
  { path: '/profile', icon: User, labelKey: 'nav.profile' },
  { path: '/enforcement', icon: Flag, labelKey: 'enforcement' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-100 px-2 py-2 z-40"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map(({ path, icon: Icon, labelKey, isMain }) => {
          const isActive = location.pathname === path ||
            (path === '/dashboard' && (location.pathname === '/' || location.pathname.startsWith('/dashboard'))) ||
            (path === '/contracts' && location.pathname.startsWith('/contract')) ||
            (path === '/profile' && location.pathname.startsWith('/profile')) ||
            (path === '/enforcement' && location.pathname.startsWith('/enforcement'))

          if (isMain) {
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="relative -mt-6"
              >
                <div className="gradient-button p-4 rounded-full">
                  <Icon className="h-7 w-7 text-white" strokeWidth={1.5} />
                </div>
              </button>
            )
          }

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`
                flex flex-col items-center gap-1 px-3 py-1 rounded-lg
                transition-colors
                ${isActive ? 'text-primary-mid' : 'text-body/50 hover:text-body'}
              `}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-xs font-medium">{t(labelKey)}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-2 w-1 h-1 bg-accent rounded-full"
                />
              )}
            </button>
          )
        })}
      </div>
    </motion.nav>
  )
}

