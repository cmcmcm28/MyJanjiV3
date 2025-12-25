import { motion } from 'framer-motion'
import { Calendar, FileText, ArrowRight, Copy, User } from 'lucide-react'
import { statusColors, statusTextColors } from '../../utils/dummyData'
import { useState, useEffect, useRef } from 'react'

export default function ContractCard({ contract, onClick, showArrow = true, getUserById, isHighlighted = false }) {
  const [copied, setCopied] = useState(false)
  const cardRef = useRef(null)
  
  // Auto-scroll to highlighted card
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isHighlighted])
  
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Get counterparty name
  const getCounterpartyName = () => {
    if (contract.accepteeName) return contract.accepteeName
    if (getUserById && contract.accepteeId) {
      const user = getUserById(contract.accepteeId)
      if (user) return user.name
    }
    if (getUserById && contract.userId) {
      const user = getUserById(contract.userId)
      if (user) return user.name
    }
    return 'Unknown'
  }

  // Get dynamic deal details from formData
  const getDealDetails = () => {
    const fd = contract.formData || {}
    const details = []
    
    // Vehicle details
    if (fd.vehicleModel || fd.vehicle_model) details.push(fd.vehicleModel || fd.vehicle_model)
    if (fd.plateNumber || fd.plate_number) details.push(fd.plateNumber || fd.plate_number)
    
    // Item details
    if (fd.itemName || fd.item_name) details.push(fd.itemName || fd.item_name)
    if (fd.itemDescription || fd.item_description) details.push(fd.itemDescription || fd.item_description)
    
    // Duration
    if (fd.borrowDuration || fd.borrow_duration) details.push(`${fd.borrowDuration || fd.borrow_duration} days`)
    
    return details.length > 0 ? details.slice(0, 2).join(' • ') : null
  }

  // Get contract value (money amount)
  const getContractValue = () => {
    const fd = contract.formData || {}
    const amount = fd.loanAmount || fd.loan_amount || 
                   fd.depositAmount || fd.deposit_amount || 
                   fd.projectBudget || fd.project_budget ||
                   fd.totalAmount || fd.total_amount ||
                   fd.amount || 0
    const value = Number(amount) || 0
    return value > 0 ? `RM ${value.toLocaleString()}` : null
  }

  // Shorten contract ID to last 8 chars
  const getShortId = () => {
    if (!contract.id) return 'N/A'
    return '...' + contract.id.slice(-8)
  }

  // Copy full ID to clipboard
  const handleCopyId = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(contract.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Status border colors (4px left strip)
  const statusBorderColor = {
    Ongoing: 'border-l-green-500',
    Pending: 'border-l-orange-500',
    Completed: 'border-l-blue-500',
    Breached: 'border-l-red-500',
    Declined: 'border-l-gray-400',
  }

  const statusBgColor = {
    Ongoing: 'bg-green-500',
    Pending: 'bg-orange-500',
    Completed: 'bg-blue-500',
    Breached: 'bg-red-500',
    Declined: 'bg-gray-400',
  }

  const statusDotColor = {
    Ongoing: 'bg-green-400',
    Pending: 'bg-orange-400',
    Completed: 'bg-blue-400',
    Breached: 'bg-red-400',
    Declined: 'bg-gray-300',
  }

  const contractValue = getContractValue()

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        bg-surface rounded-2xl card-shadow p-4 cursor-pointer transition-all hover:shadow-lg
        border-l-4 ${statusBorderColor[contract.status]}
        ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-lg shadow-primary/20' : ''}
      `}
      animate={isHighlighted ? {
        boxShadow: [
          '0 0 0 0 rgba(29, 78, 216, 0)',
          '0 0 20px 4px rgba(29, 78, 216, 0.4)',
          '0 0 0 0 rgba(29, 78, 216, 0)'
        ]
      } : {}}
      transition={isHighlighted ? {
        duration: 1.5,
        repeat: 2,
        ease: 'easeInOut'
      } : {}}
    >
      <div className="flex items-start gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Contract Title - Bold, Dark Navy */}
              <h3 className="font-bold text-[#1E293B] truncate">
                {contract.name}
              </h3>
              {/* Counterparty - Medium Blue */}
              <p className="text-sm text-[#3B82F6] font-medium truncate flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {getCounterpartyName()}
              </p>
              {/* Dynamic deal details or fallback to topic */}
              <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                {getDealDetails() || contract.topic}
              </p>
            </div>

            {/* Right Side: Value + Status */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {/* Contract Value */}
              {contractValue && (
                <p className="font-bold text-sm text-green-600">
                  {contractValue}
                </p>
              )}
              
              {/* Status badge */}
              <span className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white shrink-0
                ${statusBgColor[contract.status]}
              `}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor[contract.status]} animate-pulse`} />
                {contract.status}
              </span>
            </div>
          </div>

          {/* Meta info - 12px, Light Grey */}
          <div className="flex items-center gap-4 mt-3 text-[12px] text-[#94A3B8]">
            <div className="flex items-center gap-1 group cursor-pointer" onClick={handleCopyId}>
              <FileText className="h-3.5 w-3.5" />
              <span className="font-mono">{getShortId()}</span>
              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              {copied && <span className="text-green-500 text-xs">Copied!</span>}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Due: {formatDate(contract.dueDate)}</span>
            </div>
          </div>

          {/* Decline info */}
          {contract.status === 'Declined' && contract.declinedAt && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[12px] text-[#94A3B8]">
                Declined on {new Date(contract.declinedAt).toLocaleDateString('en-MY')}
              </p>
              {contract.declineReason && (
                <p className="text-[12px] text-[#64748B] mt-1 italic">
                  "{contract.declineReason}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Arrow */}
        {showArrow && (
          <ArrowRight className="h-5 w-5 text-[#94A3B8] flex-shrink-0 mt-1" />
        )}
      </div>
    </motion.div>
  )
}

