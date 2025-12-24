import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    AlertTriangle,
    Sparkles,
    Loader2,
    ChevronRight,
    ChevronLeft,
    MessageSquare,
    Eye,
    RefreshCw,
} from 'lucide-react'
import Button from '../ui/Button'
import { analyzeContract, getImportanceColors, getCategoryInfo } from '../../services/aiAnnotationService'

/**
 * AI Annotated Contract Viewer Component
 * Displays contract text with AI-highlighted important clauses
 * and a sidebar showing annotation summaries
 */
export default function AIAnnotatedContractViewer({
    agreementText = '',
    contractId = null,
    onClose = null,
    showAnalyzeButton = true,
}) {
    const [annotations, setAnnotations] = useState([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [error, setError] = useState(null)
    const [activeAnnotation, setActiveAnnotation] = useState(null)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [hasAnalyzed, setHasAnalyzed] = useState(false)

    const textContainerRef = useRef(null)
    const annotationRefs = useRef({})

    // Analyze contract on mount if text provided
    useEffect(() => {
        if (agreementText && !hasAnalyzed && !showAnalyzeButton) {
            handleAnalyze()
        }
    }, [agreementText])

    const handleAnalyze = async () => {
        if (!agreementText || agreementText.length < 50) {
            setError('Contract text is too short for analysis')
            return
        }

        setIsAnalyzing(true)
        setError(null)

        try {
            const result = await analyzeContract(agreementText, contractId)

            if (result.success) {
                setAnnotations(result.annotations || [])
                setHasAnalyzed(true)
                if (result.annotations?.length > 0) {
                    setActiveAnnotation(0)
                }
            } else {
                setError(result.error || 'Failed to analyze contract')
            }
        } catch (err) {
            console.error('Analysis error:', err)
            setError(err.message || 'An error occurred during analysis')
        } finally {
            setIsAnalyzing(false)
        }
    }

    // Scroll to annotation in text
    const scrollToHighlight = useCallback((index) => {
        setActiveAnnotation(index)
        const annotation = annotations[index]
        if (!annotation) return

        // Find and scroll to the highlight element
        const highlightEl = document.getElementById(`highlight-${index}`)
        if (highlightEl) {
            highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [annotations])

    // Scroll sidebar to annotation
    const scrollToSidebarAnnotation = useCallback((index) => {
        const annotationEl = annotationRefs.current[index]
        if (annotationEl) {
            annotationEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [])

    // Handle clicking on a highlight in the text
    const handleHighlightClick = (index) => {
        setActiveAnnotation(index)
        scrollToSidebarAnnotation(index)
    }

    // Render text with highlights
    const renderHighlightedText = () => {
        if (!agreementText) return null
        if (annotations.length === 0) {
            return <div className="whitespace-pre-wrap text-body leading-relaxed">{agreementText}</div>
        }

        // Sort annotations by start_index
        const sortedAnnotations = [...annotations]
            .map((a, i) => ({ ...a, originalIndex: i }))
            .sort((a, b) => a.start_index - b.start_index)

        const parts = []
        let lastIndex = 0

        sortedAnnotations.forEach((annotation, idx) => {
            const { start_index, end_index, importance_level, originalIndex } = annotation
            const colors = getImportanceColors(importance_level)

            // Add text before this annotation
            if (start_index > lastIndex) {
                parts.push(
                    <span key={`text-${idx}`} className="text-body">
                        {agreementText.slice(lastIndex, start_index)}
                    </span>
                )
            }

            // Add highlighted annotation
            parts.push(
                <mark
                    key={`highlight-${idx}`}
                    id={`highlight-${originalIndex}`}
                    onClick={() => handleHighlightClick(originalIndex)}
                    className={`
            cursor-pointer rounded px-0.5 transition-all duration-200
            ${colors.highlight}
            ${activeAnnotation === originalIndex ? 'ring-2 ring-primary ring-offset-1' : ''}
            hover:brightness-95
          `}
                >
                    {agreementText.slice(start_index, end_index)}
                </mark>
            )

            lastIndex = end_index
        })

        // Add remaining text
        if (lastIndex < agreementText.length) {
            parts.push(
                <span key="text-end" className="text-body">
                    {agreementText.slice(lastIndex)}
                </span>
            )
        }

        return <div className="whitespace-pre-wrap leading-relaxed">{parts}</div>
    }

    return (
        <div className="flex flex-col h-full">
            {/* AI Disclaimer Banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
                <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                        AI-generated summary for informational purposes only. Not legal advice.
                    </span>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Contract Text with Highlights */}
                <div
                    ref={textContainerRef}
                    className={`flex-1 overflow-y-auto p-6 bg-white transition-all duration-300 ${sidebarCollapsed ? 'pr-16' : ''
                        }`}
                >
                    {/* Analyze Button */}
                    {showAnalyzeButton && !hasAnalyzed && (
                        <div className="mb-6 flex justify-center">
                            <Button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !agreementText}
                                icon={isAnalyzing ? Loader2 : Sparkles}
                                loading={isAnalyzing}
                                className="gradient-primary"
                            >
                                {isAnalyzing ? 'Analyzing with AI...' : 'Analyze Contract with AI'}
                            </Button>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                className="mt-2 text-red-600 underline text-xs hover:text-red-800"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Loading state */}
                    {isAnalyzing && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                            </div>
                            <p className="mt-4 text-body/60 text-sm">AI is analyzing your contract...</p>
                            <p className="text-body/40 text-xs mt-1">This may take a few seconds</p>
                        </div>
                    )}

                    {/* Contract text with highlights */}
                    {!isAnalyzing && agreementText && renderHighlightedText()}

                    {/* Empty state */}
                    {!isAnalyzing && !agreementText && (
                        <div className="flex flex-col items-center justify-center py-12 text-body/50">
                            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                            <p>No contract text provided</p>
                        </div>
                    )}
                </div>

                {/* Right: Annotations Sidebar */}
                <AnimatePresence>
                    {!sidebarCollapsed && annotations.length > 0 && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-l border-gray-200 bg-gray-50 overflow-hidden flex flex-col"
                        >
                            {/* Sidebar Header */}
                            <div className="p-4 border-b border-gray-200 bg-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                        <h3 className="font-semibold text-header">AI Insights</h3>
                                    </div>
                                    <span className="text-xs text-body/50 bg-gray-100 px-2 py-1 rounded-full">
                                        {annotations.length} found
                                    </span>
                                </div>
                            </div>

                            {/* Annotations List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {annotations.map((annotation, index) => {
                                    const colors = getImportanceColors(annotation.importance_level)
                                    const categoryInfo = getCategoryInfo(annotation.category)

                                    return (
                                        <motion.div
                                            key={index}
                                            ref={(el) => (annotationRefs.current[index] = el)}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => scrollToHighlight(index)}
                                            className={`
                        p-3 rounded-xl border cursor-pointer transition-all duration-200
                        ${activeAnnotation === index
                                                    ? `${colors.bg} ${colors.border} shadow-md`
                                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                                }
                      `}
                                        >
                                            {/* Category & Importance */}
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                                                    {categoryInfo.emoji} {categoryInfo.label}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
                                                    <span className="text-xs text-body/50 capitalize">
                                                        {annotation.importance_level}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Summary */}
                                            <p className="text-sm text-body leading-relaxed">
                                                {annotation.summary}
                                            </p>

                                            {/* View in document link */}
                                            <button
                                                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    scrollToHighlight(index)
                                                }}
                                            >
                                                <Eye className="h-3 w-3" />
                                                View in document
                                            </button>
                                        </motion.div>
                                    )
                                })}
                            </div>

                            {/* Re-analyze button */}
                            <div className="p-3 border-t border-gray-200 bg-white">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="w-full flex items-center justify-center gap-2 text-sm text-body/60 hover:text-primary transition-colors py-2"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                                    Re-analyze
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sidebar Toggle (when collapsed) */}
                {annotations.length > 0 && (
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className={`
              absolute right-0 top-1/2 -translate-y-1/2 z-10
              bg-white border border-gray-200 rounded-l-lg px-1 py-3 shadow-md
              hover:bg-gray-50 transition-colors
              ${sidebarCollapsed ? '' : 'hidden'}
            `}
                    >
                        <ChevronLeft className="h-4 w-4 text-body/60" />
                    </button>
                )}

                {/* Collapse button (when expanded) */}
                {annotations.length > 0 && !sidebarCollapsed && (
                    <button
                        onClick={() => setSidebarCollapsed(true)}
                        className="absolute right-[320px] top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-l-lg px-1 py-3 shadow-md hover:bg-gray-50 transition-colors"
                    >
                        <ChevronRight className="h-4 w-4 text-body/60" />
                    </button>
                )}
            </div>
        </div>
    )
}
