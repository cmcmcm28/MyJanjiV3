import { forwardRef } from 'react'
import { motion } from 'framer-motion'

const variants = {
  primary: 'gradient-primary text-white hover:opacity-90',
  secondary: 'bg-secondary text-white hover:bg-secondary/90',
  outline: 'border-2 border-primary text-primary hover:bg-primary/10',
  ghost: 'text-primary hover:bg-primary/10',
  danger: 'bg-status-breached text-white hover:bg-status-breached/90',
  success: 'bg-status-ongoing text-white hover:bg-status-ongoing/90',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-6 py-3.5 text-lg',
  xl: 'px-8 py-4 text-xl',
}

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  ...props
}, ref) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-xl
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-primary/50
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5\" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon className="h-5 w-5" />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className="h-5 w-5" />}
    </motion.button>
  )
})

Button.displayName = 'Button'

export default Button

