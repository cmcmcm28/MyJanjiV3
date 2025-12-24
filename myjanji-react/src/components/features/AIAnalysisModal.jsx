import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, AlertTriangle } from 'lucide-react'
import AIAnnotatedContractViewer from './AIAnnotatedContractViewer'

/**
 * Modal wrapper for AI contract analysis
 * Displays the AIAnnotatedContractViewer in a full-screen modal
 */
export default function AIAnalysisModal({
    isOpen,
    onClose,
    agreementText = '',
    contractId = null,
    title = 'AI Contract Analysis',
}) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl gradient-primary">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-header">{title}</h3>
                                    <p className="text-xs text-body/60">AI-powered clause extraction and analysis</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                <X className="h-5 w-5 text-body" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden relative">
                            <AIAnnotatedContractViewer
                                agreementText={agreementText}
                                contractId={contractId}
                                onClose={onClose}
                                showAnalyzeButton={true}
                            />
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-body/50">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>This analysis is AI-generated and should not be considered legal advice.</span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
