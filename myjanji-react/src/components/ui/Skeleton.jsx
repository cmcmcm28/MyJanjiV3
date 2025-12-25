import { motion } from 'framer-motion'

/**
 * Base Skeleton component with shimmer animation
 */
export default function Skeleton({
    className = '',
    width,
    height,
    rounded = 'md',
    animate = true
}) {
    const roundedClasses = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
        full: 'rounded-full',
    }

    const style = {
        width: width || '100%',
        height: height || '1rem',
    }

    return (
        <div
            className={`
        bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200
        ${animate ? 'animate-shimmer' : ''}
        ${roundedClasses[rounded] || 'rounded-md'}
        ${className}
      `}
            style={{
                ...style,
                backgroundSize: '200% 100%',
            }}
        />
    )
}

/**
 * Skeleton for text lines
 */
export function SkeletonText({ lines = 3, className = '' }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height="0.875rem"
                    width={i === lines - 1 ? '60%' : '100%'}
                />
            ))}
        </div>
    )
}

/**
 * Skeleton for stat cards (like on dashboard)
 */
export function SkeletonStatCard({ className = '' }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`bg-surface rounded-2xl p-4 card-shadow ${className}`}
        >
            <div className="flex items-center gap-3">
                <Skeleton width="2.5rem" height="2.5rem" rounded="xl" />
                <div className="flex-1">
                    <Skeleton width="3rem" height="1.5rem" className="mb-1" />
                    <Skeleton width="4rem" height="0.75rem" />
                </div>
            </div>
        </motion.div>
    )
}

/**
 * Skeleton for contract cards
 */
export function SkeletonContractCard({ className = '' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-surface rounded-2xl p-4 card-shadow ${className}`}
        >
            <div className="flex items-start gap-4">
                {/* Status bar skeleton */}
                <Skeleton width="0.25rem" height="4rem" rounded="full" />

                {/* Content skeleton */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <Skeleton width="70%" height="1.25rem" className="mb-2" />
                            <Skeleton width="50%" height="0.875rem" />
                        </div>
                        {/* Status badge skeleton */}
                        <Skeleton width="4.5rem" height="1.5rem" rounded="full" />
                    </div>

                    {/* Footer skeleton */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                        <Skeleton width="5rem" height="0.75rem" />
                        <Skeleton width="5rem" height="0.75rem" />
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

/**
 * Skeleton for contract list
 */
export function SkeletonContractList({ count = 3, className = '' }) {
    return (
        <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonContractCard key={i} />
            ))}
        </div>
    )
}

/**
 * Skeleton for dashboard stats row
 */
export function SkeletonStatsRow({ count = 3, className = '' }) {
    return (
        <div className={`grid grid-cols-3 gap-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonStatCard key={i} />
            ))}
        </div>
    )
}

/**
 * Skeleton for a generic card with title and content
 */
export function SkeletonCard({ className = '', hasIcon = true }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`bg-surface rounded-3xl p-6 card-shadow ${className}`}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                {hasIcon && <Skeleton width="2rem" height="2rem" rounded="lg" />}
                <Skeleton width="8rem" height="1.25rem" />
            </div>

            {/* Content */}
            <SkeletonText lines={3} />
        </motion.div>
    )
}

/**
 * Skeleton for user profile/avatar
 */
export function SkeletonAvatar({ size = 'md', className = '' }) {
    const sizes = {
        sm: '2rem',
        md: '3rem',
        lg: '4rem',
        xl: '5rem',
    }

    return (
        <Skeleton
            width={sizes[size]}
            height={sizes[size]}
            rounded="full"
            className={className}
        />
    )
}

/**
 * Skeleton for action/pending contract cards
 */
export function SkeletonActionCard({ className = '' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100 ${className}`}
        >
            <div className="flex items-center gap-4">
                <Skeleton width="3rem" height="3rem" rounded="xl" className="!bg-orange-100" />
                <div className="flex-1">
                    <Skeleton width="60%" height="1rem" className="mb-2 !bg-orange-100" />
                    <Skeleton width="40%" height="0.75rem" className="!bg-orange-100" />
                </div>
                <Skeleton width="4rem" height="2rem" rounded="lg" className="!bg-orange-100" />
            </div>
        </motion.div>
    )
}

/**
 * Full page loading skeleton for Dashboard
 */
export function DashboardSkeleton() {
    return (
        <div className="px-4 space-y-6 animate-in fade-in duration-300">
            {/* Greeting skeleton */}
            <div className="mb-4">
                <Skeleton width="60%" height="1.5rem" className="mb-2" />
                <Skeleton width="40%" height="1rem" />
            </div>

            {/* Search bar skeleton */}
            <Skeleton height="3rem" rounded="2xl" className="mb-6" />

            {/* Stats row skeleton */}
            <SkeletonStatsRow count={3} />

            {/* Pending actions skeleton */}
            <div className="mt-6">
                <Skeleton width="10rem" height="1.25rem" className="mb-3" />
                <SkeletonActionCard />
            </div>

            {/* Recent contracts skeleton */}
            <div className="mt-6">
                <Skeleton width="10rem" height="1.25rem" className="mb-3" />
                <SkeletonContractList count={3} />
            </div>
        </div>
    )
}

/**
 * Full page loading skeleton for Contracts page
 */
export function ContractsPageSkeleton() {
    return (
        <div className="px-4 space-y-4 animate-in fade-in duration-300">
            {/* Tab bar skeleton */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        width="5rem"
                        height="2.25rem"
                        rounded="full"
                    />
                ))}
            </div>

            {/* Search bar skeleton */}
            <Skeleton height="3rem" rounded="xl" />

            {/* Contract list skeleton */}
            <SkeletonContractList count={5} />
        </div>
    )
}
