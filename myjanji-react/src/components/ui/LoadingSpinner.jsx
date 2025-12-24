import { motion } from 'framer-motion'

/**
 * Loading Spinner component
 */
export default function LoadingSpinner({
    size = 'md',
    color = 'primary',
    className = ''
}) {
    const sizes = {
        xs: 'w-3 h-3 border-[2px]',
        sm: 'w-4 h-4 border-2',
        md: 'w-6 h-6 border-2',
        lg: 'w-8 h-8 border-3',
        xl: 'w-12 h-12 border-4',
    }

    const colors = {
        primary: 'border-primary-mid border-t-transparent',
        white: 'border-white border-t-transparent',
        gray: 'border-gray-300 border-t-gray-600',
        accent: 'border-accent border-t-transparent',
    }

    return (
        <div
            className={`
        ${sizes[size]} 
        ${colors[color]} 
        rounded-full 
        animate-spin
        ${className}
      `}
        />
    )
}

/**
 * Loading overlay for full-page loading states
 */
export function LoadingOverlay({
    message = 'Loading...',
    transparent = false,
    size = 'lg'
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`
        fixed inset-0 z-50 flex flex-col items-center justify-center
        ${transparent ? 'bg-black/30' : 'bg-background'}
      `}
        >
            <LoadingSpinner size={size} />
            {message && (
                <p className={`mt-4 text-sm font-medium ${transparent ? 'text-white' : 'text-body'}`}>
                    {message}
                </p>
            )}
        </motion.div>
    )
}

/**
 * Loading state for buttons (inline spinner with optional text)
 */
export function ButtonLoading({ text = 'Loading...', size = 'sm' }) {
    return (
        <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size={size} color="white" />
            <span>{text}</span>
        </span>
    )
}

/**
 * Pulse dots loading indicator
 */
export function PulseDots({ className = '' }) {
    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-2 h-2 bg-primary-mid rounded-full"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                    }}
                />
            ))}
        </div>
    )
}

/**
 * Progress bar for longer loading operations
 */
export function ProgressBar({ progress = 0, className = '' }) {
    return (
        <div className={`w-full h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
            <motion.div
                className="h-full bg-gradient-to-r from-primary-mid to-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                transition={{ duration: 0.3 }}
            />
        </div>
    )
}

/**
 * Indeterminate progress bar (when progress is unknown)
 */
export function IndeterminateProgress({ className = '' }) {
    return (
        <div className={`w-full h-1 bg-gray-200 rounded-full overflow-hidden ${className}`}>
            <motion.div
                className="h-full w-1/3 bg-gradient-to-r from-primary-mid to-accent rounded-full"
                animate={{
                    x: ['-100%', '400%'],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </div>
    )
}
