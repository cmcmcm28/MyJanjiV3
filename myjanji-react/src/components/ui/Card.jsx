import { motion } from 'framer-motion'

export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  glass = true,
  onClick,
  'aria-label': ariaLabel,
  role: customRole,
  ...props
}) {
  const paddingSizes = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  }

  // Determine if card is interactive (clickable)
  const isInteractive = Boolean(onClick)

  // Handle keyboard activation (Enter and Space)
  const handleKeyDown = (e) => {
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick?.(e)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      className={`
        rounded-3xl
        ${glass ? 'card-glass' : 'bg-surface card-shadow'}
        ${paddingSizes[padding]}
        ${hover ? 'cursor-pointer transition-all duration-300 hover:shadow-xl' : ''}
        ${isInteractive ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2' : ''}
        ${className}
      `}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={customRole || (isInteractive ? 'button' : undefined)}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-bold text-header tracking-tight ${className}`}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-body/70 mt-1 ${className}`}>
      {children}
    </p>
  )
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  )
}

