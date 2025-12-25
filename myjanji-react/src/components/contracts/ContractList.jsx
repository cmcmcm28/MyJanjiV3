import { motion, AnimatePresence } from 'framer-motion'
import ContractCard from './ContractCard'
import { FileX } from 'lucide-react'
import { SkeletonContractList } from '../ui/Skeleton'
import { useRef, useEffect } from 'react'

export default function ContractList({
  contracts,
  onContractClick,
  emptyMessage = 'No contracts found',
  loading = false,
  skeletonCount = 3,
  getUserById,
  highlightedId
}) {
  // Show skeleton while loading
  if (loading) {
    return <SkeletonContractList count={skeletonCount} />
  }

  if (!contracts || contracts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 text-body/50"
      >
        <FileX className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">{emptyMessage}</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {contracts.map((contract, index) => {
          const isHighlighted = highlightedId && contract.id === highlightedId
          
          return (
            <motion.div
              key={contract.id}
              id={`contract-${contract.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: isHighlighted ? [1, 1.02, 1] : 1
              }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
            >
              <ContractCard
                contract={contract}
                onClick={() => onContractClick?.(contract)}
                getUserById={getUserById}
                isHighlighted={isHighlighted}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

