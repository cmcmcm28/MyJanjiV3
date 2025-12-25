import { motion } from 'framer-motion'

export default function Gauge({
    value,
    max = 100,
    label,
    color = 'text-primary',
    bgColor = 'text-gray-200',
    icon: Icon
}) {
    // normalize value to percentage 0-100
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    // Semi-circle circumference calculation
    // Radius = 40
    // Circumference of full circle = 2 * pi * r = ~251
    // Semi-circle arc length = pi * r = ~125.6
    const radius = 40
    const circumference = Math.PI * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
        <div className="flex flex-col items-center justify-center relative">
            <div className="relative w-32 h-20 -mb-4 overflow-hidden">
                <svg
                    className="w-32 h-32 transform rotate-[0deg]" // rotated via path definition or css
                    viewBox="0 0 100 100"
                >
                    {/* Background Arc */}
                    <path
                        d="M 10 50 A 40 40 0 0 1 90 50" // Semi-circle path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="10"
                        className={`${bgColor}`}
                    />
                    {/* Progress Arc */}
                    <motion.path
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: strokeDashoffset }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        className={`${color}`}
                    />
                </svg>

                {/* Needle/Value Indicator - Optional, for now just text */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2">
                    {/* If we wanted a needle it would be complex rotation math. 
               Let's stick to the clean number centered below or inside. */}
                </div>
            </div>

            <div className="text-center z-10 -mt-6">
                <div className="flex items-center justify-center gap-1 mb-1">
                    {Icon && <Icon className={`w-4 h-4 ${color}`} />}
                    <span className="text-2xl font-bold text-header">{value}</span>
                </div>
                <span className="text-xs text-body/60 font-medium px-2 py-0.5 rounded-full bg-surface-hover/50 border border-border/50">
                    {label}
                </span>
            </div>
        </div>
    )
}
