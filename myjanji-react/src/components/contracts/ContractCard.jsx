import { motion } from 'framer-motion'
import { Calendar, FileText, ArrowRight } from 'lucide-react'
import { statusColors, statusTextColors } from '../../utils/dummyData'

export default function ContractCard({ contract, onClick, showArrow = true }) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const statusBgColor = {
    Ongoing: 'bg-green-500',
    Pending: 'bg-orange-500',
    Completed: 'bg-gray-500',
    Breached: 'bg-red-500',
    Declined: 'bg-gray-500',
  }

  const statusDotColor = {
    Ongoing: 'bg-green-400',
    Pending: 'bg-orange-400',
    Completed: 'bg-gray-400',
    Breached: 'bg-red-400',
    Declined: 'bg-gray-400',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-surface rounded-2xl card-shadow p-4 cursor-pointer transition-shadow hover:shadow-lg"
    >
      <div className="flex items-start gap-4">
        {/* Status indicator bar */}
        <div className={`w-1 h-16 rounded-full ${statusBgColor[contract.status]}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-header truncate">
                {contract.name}
              </h3>
              <p className="text-sm text-body/60 truncate">
                {contract.topic}
              </p>
            </div>
            
            {/* Status badge */}
            <span className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white
              ${statusBgColor[contract.status]}
            `}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor[contract.status]} animate-pulse`} />
              {contract.status}
            </span>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-3 text-xs text-body/50">
            <div className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              <span>{contract.id}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Due: {formatDate(contract.dueDate)}</span>
            </div>
          </div>

          {/* Decline info */}
          {contract.status === 'Declined' && contract.declinedAt && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-body/50">
                Declined on {new Date(contract.declinedAt).toLocaleDateString('en-MY')}
              </p>
              {contract.declineReason && (
                <p className="text-xs text-body/60 mt-1 italic">
                  "{contract.declineReason}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Arrow */}
        {showArrow && (
          <ArrowRight className="h-5 w-5 text-body/30 flex-shrink-0 mt-1" />
        )}
      </div>
    </motion.div>
  )
}

