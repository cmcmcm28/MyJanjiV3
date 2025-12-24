import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Loader2, FileText, Download, ZoomIn, ZoomOut, AlertCircle,
  Sparkles, AlertTriangle, ChevronRight, ChevronLeft, RefreshCw, Eye, FileType
} from 'lucide-react'
import Button from '../ui/Button'
import pdfService from '../../services/pdfService'
import { analyzeContract, getImportanceColors, getCategoryInfo } from '../../services/aiAnnotationService'

// Backend API URL for contract preview
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default function PDFPreviewModal({
  isOpen,
  onClose,
  contract,
  creator,
  acceptee,
  templateType,
  formData,
  title = 'Contract Preview',
  allowDownload = false,
  useBackend = true,
  prepareId = null,
  isPreparing = false,
  directPdfUrl = null,
  showAIAnalysis = true, // NEW: Enable AI analysis panel
}) {
  const [pdfUrl, setPdfUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(100)

  // AI Analysis states
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [annotations, setAnnotations] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiError, setAIError] = useState(null)
  const [activeAnnotation, setActiveAnnotation] = useState(null)
  const [viewMode, setViewMode] = useState('pdf') // 'pdf' or 'text'
  const [agreementText, setAgreementText] = useState('')
  const [highlightedPdfUrl, setHighlightedPdfUrl] = useState(null)
  const [pageInfo, setPageInfo] = useState([]) // Page numbers for each annotation

  const annotationRefs = useRef({})
  const highlightRefs = useRef({})
  const pdfIframeRef = useRef(null)

  // Generate cache key based on contract ID or template+formData hash
  const getCacheKey = () => {
    const contractId = contract?.id || contract?.contract_id
    if (contractId) return `ai_analysis_${contractId}`
    // For unsigned contracts, use template + a hash of form data
    return `ai_analysis_${templateType}_${JSON.stringify(formData).slice(0, 100)}`
  }

  // Load cached AI analysis from sessionStorage
  const loadCachedAnalysis = () => {
    try {
      const cached = sessionStorage.getItem(getCacheKey())
      if (cached) {
        const data = JSON.parse(cached)
        console.log('✨ Loaded cached AI analysis')
        return data
      }
    } catch (e) {
      console.log('Cache load failed:', e)
    }
    return null
  }

  // Save AI analysis to sessionStorage
  const saveCacheAnalysis = (data) => {
    try {
      sessionStorage.setItem(getCacheKey(), JSON.stringify(data))
      console.log('💾 Saved AI analysis to cache')
    } catch (e) {
      console.log('Cache save failed:', e)
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (directPdfUrl) {
        setPdfUrl(directPdfUrl)
        setLoading(false)
      } else {
        generatePreview()
      }

      // Load cached AI analysis instead of resetting
      const cached = loadCachedAnalysis()
      if (cached) {
        setAnnotations(cached.annotations || [])
        setPageInfo(cached.pageInfo || [])
        // Don't auto-show panel, but data is ready
        setAIError(null)
      } else {
        // No cache - reset state
        setAnnotations([])
        setShowAIPanel(false)
        setAIError(null)
        setPageInfo([])
      }
      setHighlightedPdfUrl(null) // PDF blob can't be cached, will regenerate
    }
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [isOpen, contract, templateType, formData, prepareId, directPdfUrl])

  const generatePreview = async () => {
    setLoading(true)
    setError(null)

    try {
      let result

      if (prepareId) {
        console.log('📄 Fetching pre-generated contract:', prepareId)
        result = await fetchPreparedContract(prepareId)
      } else if (useBackend && templateType) {
        console.log('📄 Generating preview from backend for template:', templateType)
        result = await generateBackendPreview()
      } else if (contract) {
        result = await pdfService.generateContractPDF(contract, creator, acceptee, {
          templateType,
          formData,
          includeSignatures: false,
        })
      } else {
        result = await pdfService.generateTemplatedPDF(templateType, formData, {
          creator,
          acceptee,
          includeSignatures: false,
        })
      }

      if (result.success) {
        setPdfUrl(result.url)
      } else {
        setError(result.error || 'Failed to generate PDF preview')
      }
    } catch (err) {
      console.error('PDF preview error:', err)
      setError('Failed to generate PDF preview. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchPreparedContract = async (prepareId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/get_prepared_contract/${prepareId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch prepared contract: ${response.status}`)
      }
      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      return { success: true, url }
    } catch (err) {
      console.error('Failed to fetch prepared contract:', err)
      return await generateBackendPreview()
    }
  }

  const generateBackendPreview = async () => {
    try {
      const placeholders = buildPlaceholders(formData, creator, acceptee)
      const response = await fetch(`${BACKEND_URL}/preview_contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_name: templateType, placeholders }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Backend error: ${response.status}`)
      }

      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      return { success: true, url }
    } catch (err) {
      console.error('Backend preview error:', err)
      return await pdfService.generateTemplatedPDF(templateType, formData, {
        creator,
        acceptee,
        includeSignatures: false,
      })
    }
  }

  const buildPlaceholders = (formData, creator, acceptee) => {
    return {
      creator_name: creator?.name || formData?.creatorName || '',
      creator_id_number: creator?.ic || formData?.creatorIc || '',
      acceptee_name: acceptee?.name || formData?.accepteeName || '',
      acceptee_id_number: acceptee?.ic || formData?.accepteeIc || '',
      start_date: formatDate(formData?.startDate),
      end_date: formatDate(formData?.endDate || formData?.returnDate || formData?.dueDate),
      return_date: formatDate(formData?.returnDate || formData?.dueDate),
      due_date: formatDate(formData?.dueDate),
      effective_date: formatDate(formData?.effectiveDate || new Date()),
      signing_date: formatDate(new Date()),
      item_name: formData?.item || formData?.itemName || formData?.name || '',
      item_description: formData?.description || formData?.itemDescription || '',
      item_condition: formData?.condition || formData?.itemCondition || 'Good',
      item_value: formData?.value || formData?.estimatedValue || '',
      equipment_list: formData?.equipmentList || formData?.equipment || '',
      replacement_value: formData?.replacementValue || formData?.value || '',
      rental_fee: formData?.rentalFee || '',
      payment_frequency: formData?.paymentFrequency || '',
      amount: formData?.amount || formData?.loanAmount || '',
      interest_rate: formData?.interestRate || '0',
      payment_terms: formData?.paymentTerms || '',
      vehicle_list: formData?.vehicleList || formData?.vehicleModel || '',
      vehicle_model: formData?.vehicleModel || formData?.model || '',
      vehicle_plate: formData?.vehiclePlate || formData?.plateNumber || '',
      vehicle_color: formData?.vehicleColor || formData?.color || '',
      terms: formData?.terms || formData?.additionalTerms || '',
      notes: formData?.notes || '',
      location: formData?.location || '',
      ...formData,
    }
  }

  const formatDate = (date) => {
    if (!date) return ''
    try {
      const d = new Date(date)
      return d.toLocaleDateString('en-MY', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return String(date)
    }
  }

  // Generate agreement text for AI analysis
  const generateAgreementText = () => {
    const fd = formData || {}
    const lines = [
      `CONTRACT: ${contract?.name || contract?.contract_name || 'Agreement'}`,
      `Template: ${templateType || 'General'}`,
      '',
      'PARTIES:',
      `- Creator/Lender: ${creator?.name || fd.creatorName || fd.creator_name || 'Party A'}`,
      `- Acceptee/Borrower: ${acceptee?.name || fd.accepteeName || fd.acceptee_name || 'Party B'}`,
      '',
      'TERMS AND CONDITIONS:',
    ]

    // Add form data fields
    Object.entries(fd).forEach(([key, value]) => {
      if (value && typeof value !== 'object' && !key.includes('signature')) {
        const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
        lines.push(`- ${label}: ${value}`)
      }
    })

    lines.push('')
    lines.push('STANDARD CLAUSES:')

    // Add template-specific clauses
    if (templateType?.includes('LOAN') || templateType?.includes('MONEY')) {
      lines.push('1. REPAYMENT: The Borrower agrees to repay the full loan amount according to the specified terms.')
      lines.push('2. LATE PAYMENT: In the event of late payment, a penalty fee may be applied as agreed by both parties.')
      lines.push('3. DEFAULT: If the Borrower fails to make payment, the Lender reserves the right to take legal action.')
    } else if (templateType?.includes('ITEM') || templateType?.includes('VEHICLE')) {
      lines.push('1. CONDITION: The Borrower acknowledges receiving items in good condition.')
      lines.push('2. LIABILITY: The Borrower is responsible for any damage, loss, or theft during the borrowing period.')
      lines.push('3. RETURN: Items must be returned by the agreed end date.')
    } else if (templateType?.includes('FREELANCE') || templateType?.includes('SERVICE')) {
      lines.push('1. SCOPE OF WORK: The Contractor agrees to perform services as described.')
      lines.push('2. PAYMENT: Payment shall be made according to the terms specified.')
      lines.push('3. CONFIDENTIALITY: The Contractor agrees to maintain confidentiality.')
    } else {
      lines.push('1. AGREEMENT: Both parties agree to the terms stated in this contract.')
      lines.push('2. OBLIGATIONS: Each party shall fulfill their respective obligations.')
      lines.push('3. DISPUTE RESOLUTION: Disputes shall be resolved through mutual discussion.')
    }

    lines.push('')
    lines.push('4. GOVERNING LAW: This agreement is governed by the laws of Malaysia.')
    lines.push('')
    lines.push('SIGNATURES: By signing, both parties agree to be bound by all terms herein.')

    return lines.join('\n')
  }

  // Handle AI Analysis - fetch actual DOCX text from backend
  const handleAnalyze = async () => {
    // If we already have annotations (from state or sessionStorage), use them
    if (annotations.length > 0) {
      console.log('✨ Using cached AI analysis results')
      setShowAIPanel(true)

      // If we don't have highlighted PDF yet, regenerate it from cached annotations
      if (!highlightedPdfUrl) {
        console.log('📄 Regenerating highlighted PDF from cached annotations...')
        try {
          const placeholders = buildPlaceholders(formData, creator, acceptee)
          const highlightResponse = await fetch(`${BACKEND_URL}/get_highlighted_pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              template_name: templateType,
              placeholders: placeholders,
              annotations: annotations
            })
          })

          if (highlightResponse.ok) {
            const blob = await highlightResponse.blob()
            const url = URL.createObjectURL(blob)
            setHighlightedPdfUrl(url)
            console.log('✅ Regenerated highlighted PDF')
          }
        } catch (e) {
          console.log('Failed to regenerate PDF:', e)
        }
      }
      return
    }

    setIsAnalyzing(true)
    setAIError(null)
    setShowAIPanel(true)

    try {
      // First, try to fetch actual DOCX text from backend
      let text = ''

      try {
        const placeholders = buildPlaceholders(formData, creator, acceptee)
        const docxResponse = await fetch(`${BACKEND_URL}/get_contract_text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_name: templateType,
            placeholders: placeholders
          })
        })

        if (docxResponse.ok) {
          const docxResult = await docxResponse.json()
          if (docxResult.success && docxResult.text) {
            text = docxResult.text
            console.log('✅ Got actual DOCX text:', text.length, 'chars')
          }
        }
      } catch (fetchError) {
        console.log('📄 DOCX fetch failed, using fallback:', fetchError)
      }

      // Fallback to local generation if DOCX fetch failed
      if (!text) {
        text = generateAgreementText()
        console.log('📄 Using fallback generated text:', text.length, 'chars')
      }

      setAgreementText(text)
      console.log('📤 Sending for AI analysis:', text.substring(0, 200) + '...')

      const result = await analyzeContract(text, contract?.id || contract?.contract_id)

      if (result.success) {
        const foundAnnotations = result.annotations || []
        setAnnotations(foundAnnotations)

        if (foundAnnotations.length > 0) {
          setActiveAnnotation(0)

          // Fetch highlighted PDF with actual highlights on the PDF
          try {
            console.log('📄 Fetching highlighted PDF with', foundAnnotations.length, 'annotations...')
            const placeholders = buildPlaceholders(formData, creator, acceptee)
            const highlightResponse = await fetch(`${BACKEND_URL}/get_highlighted_pdf`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                template_name: templateType,
                placeholders: placeholders,
                annotations: foundAnnotations
              })
            })

            if (highlightResponse.ok) {
              // Get page info from header
              const annotationsHeader = highlightResponse.headers.get('X-Annotations')
              let pageData = []
              if (annotationsHeader) {
                try {
                  pageData = JSON.parse(annotationsHeader)
                  setPageInfo(pageData)
                  console.log('📍 Page info:', pageData)
                } catch (e) {
                  console.log('Failed to parse page info')
                }
              }

              // Save to persistent cache (sessionStorage)
              saveCacheAnalysis({
                annotations: foundAnnotations,
                pageInfo: pageData
              })

              const blob = await highlightResponse.blob()
              const url = URL.createObjectURL(blob)
              setHighlightedPdfUrl(url)
              console.log('✅ Got highlighted PDF')
            } else {
              console.log('❌ Highlighted PDF failed')
            }
          } catch (pdfError) {
            console.log('❌ Highlighted PDF error:', pdfError)
          }

          // Stay on PDF view to show the highlighted PDF
          setViewMode('pdf')
        }
      } else {
        setAIError(result.error || 'Failed to analyze contract')
      }
    } catch (err) {
      console.error('AI analysis error:', err)
      setAIError(err.message || 'An error occurred during analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Render text with highlighted annotations
  const renderHighlightedText = () => {
    if (!agreementText) return null
    if (annotations.length === 0) {
      return <div className="whitespace-pre-wrap text-body leading-relaxed font-mono text-sm">{agreementText}</div>
    }

    // Sort annotations by start_index
    const sortedAnnotations = [...annotations]
      .map((a, i) => ({ ...a, originalIndex: i }))
      .filter(a => a.start_index >= 0 && a.end_index > a.start_index)
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
      const highlightClasses = {
        high: 'bg-red-200 border-red-400',
        medium: 'bg-orange-200 border-orange-400',
        low: 'bg-blue-200 border-blue-400',
      }

      parts.push(
        <mark
          key={`highlight-${idx}`}
          id={`highlight-${originalIndex}`}
          ref={(el) => (highlightRefs.current[originalIndex] = el)}
          onClick={() => {
            setActiveAnnotation(originalIndex)
            // Scroll sidebar to this annotation
            annotationRefs.current[originalIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }}
          className={`
            cursor-pointer rounded-sm px-1 py-0.5 border-b-2 transition-all duration-200
            ${highlightClasses[importance_level] || 'bg-gray-200 border-gray-400'}
            ${activeAnnotation === originalIndex ? 'ring-2 ring-primary ring-offset-1 shadow-lg' : ''}
            hover:brightness-95
          `}
          title={annotation.summary}
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

    return <div className="whitespace-pre-wrap leading-relaxed font-mono text-sm">{parts}</div>
  }

  // Scroll to highlight in text
  const scrollToHighlight = (index) => {
    setActiveAnnotation(index)
    const el = highlightRefs.current[index]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Navigate PDF to specific page when clicking annotation
  const navigateToPage = (index) => {
    setActiveAnnotation(index)
    const page = pageInfo[index]?.page
    if (page && highlightedPdfUrl) {
      // Update PDF URL with page parameter
      const newUrl = `${highlightedPdfUrl}#page=${page}&toolbar=0&navpanes=0`
      if (pdfIframeRef.current) {
        pdfIframeRef.current.src = newUrl
      }
      console.log(`📄 Navigating to page ${page}`)
    }
  }

  // Force re-analyze - clears cache and triggers new analysis
  const forceReanalyze = () => {
    // Clear sessionStorage cache
    try {
      sessionStorage.removeItem(getCacheKey())
      console.log('🗑️ Cleared cached AI analysis')
    } catch (e) { }

    setAnnotations([])
    setHighlightedPdfUrl(null)
    setPageInfo([])
    // Small delay to ensure state is cleared before starting new analysis
    setTimeout(() => handleAnalyze(), 100)
  }

  const handleDownload = async () => {
    if (contract) {
      await pdfService.downloadContractPDF(contract, creator, acceptee, { templateType, formData })
    } else {
      const result = await pdfService.generateTemplatedPDF(templateType, formData, { creator, acceptee })
      if (result.success) {
        const link = document.createElement('a')
        link.href = result.url
        link.download = `Contract-Preview.pdf`
        link.click()
        URL.revokeObjectURL(result.url)
      }
    }
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 ${showAIPanel ? 'max-w-6xl' : 'max-w-4xl'
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl gradient-primary">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-header">{title}</h3>
                  <p className="text-xs text-body/60">Review your contract before signing</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* AI Analysis Toggle */}
                {showAIAnalysis && (
                  <Button
                    variant={showAIPanel ? 'primary' : 'outline'}
                    size="sm"
                    onClick={showAIPanel ? () => { setShowAIPanel(false); setViewMode('pdf'); } : handleAnalyze}
                    icon={isAnalyzing ? Loader2 : Sparkles}
                    loading={isAnalyzing}
                    className={showAIPanel ? '' : 'border-primary/30 text-primary hover:bg-primary/5'}
                  >
                    {isAnalyzing ? 'Analyzing...' : showAIPanel ? 'Hide AI' : 'AI Insights'}
                  </Button>
                )}

                {/* Highlights indicator - show when AI is active */}
                {showAIPanel && highlightedPdfUrl && (
                  <div className="flex items-center px-2 py-1 bg-green-100 rounded-lg">
                    <Sparkles className="h-3 w-3 text-green-600 mr-1" />
                    <span className="text-xs font-medium text-green-700">
                      {annotations.length} Highlights
                    </span>
                  </div>
                )}

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ZoomOut className="h-4 w-4 text-body" />
                  </button>
                  <span className="text-xs font-medium text-body w-12 text-center">{zoom}%</span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ZoomIn className="h-4 w-4 text-body" />
                  </button>
                </div>

                {allowDownload && pdfUrl && (
                  <Button variant="outline" size="sm" onClick={handleDownload} icon={Download}>
                    Download
                  </Button>
                )}

                <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
                  <X className="h-5 w-5 text-body" />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* PDF Content */}
              <div className={`flex-1 overflow-auto bg-gray-100 p-4 transition-all duration-300 ${showAIPanel ? '' : ''}`}>
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
                    <div className="book-loader">
                      <div>
                        <ul>
                          {[1, 2, 3, 4, 5].map(i => (
                            <li key={i}>
                              <svg fill="currentColor" viewBox="0 0 90 120">
                                <path d="M90,0 L90,120 L11,120 C4.92486775,120 0,115.075132 0,109 L0,11 C0,4.92486775 4.92486775,0 11,0 L90,0 Z M71.5,81 L18.5,81 C17.1192881,81 16,82.1192881 16,83.5 C16,84.8254834 17.0315359,85.9100387 18.3356243,85.9946823 L18.5,86 L71.5,86 C72.8807119,86 74,84.8807119 74,83.5 C74,82.1745166 72.9684641,81.0899613 71.6643757,81.0053177 L71.5,81 Z M71.5,57 L18.5,57 C17.1192881,57 16,58.1192881 16,59.5 C16,60.8254834 17.0315359,61.9100387 18.3356243,61.9946823 L18.5,62 L71.5,62 C72.8807119,62 74,60.8807119 74,59.5 C74,58.1745166 72.9684641,57.0899613 71.6643757,57.0053177 L71.5,57 Z M71.5,33 L18.5,33 C17.1192881,33 16,34.1192881 16,35.5 C16,36.8254834 17.0315359,37.9100387 18.3356243,37.9946823 L18.5,38 L71.5,38 C72.8807119,38 74,36.8807119 74,35.5 C74,34.1745166 72.9684641,33.0899613 71.6643757,33.0053177 L71.5,33 Z"></path>
                              </svg>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span>Generating preview...</span>
                    </div>
                    <style>{`
                      .book-loader { --background: linear-gradient(135deg, #23C4F8, #275EFE); --shadow: rgba(39, 94, 254, 0.28); --text: #6C7486; --page: rgba(255, 255, 255, 0.36); --page-fold: rgba(255, 255, 255, 0.52); --duration: 3s; width: 200px; height: 140px; position: relative; }
                      .book-loader:before, .book-loader:after { --r: -6deg; content: ""; position: absolute; bottom: 8px; width: 120px; top: 80%; box-shadow: 0 16px 12px var(--shadow); transform: rotate(var(--r)); }
                      .book-loader:before { left: 4px; }
                      .book-loader:after { --r: 6deg; right: 4px; }
                      .book-loader div { width: 100%; height: 100%; border-radius: 13px; position: relative; z-index: 1; perspective: 600px; box-shadow: 0 4px 6px var(--shadow); background-image: var(--background); }
                      .book-loader div ul { margin: 0; padding: 0; list-style: none; position: relative; }
                      .book-loader div ul li { --r: 180deg; --o: 0; --c: var(--page); position: absolute; top: 10px; left: 10px; transform-origin: 100% 50%; color: var(--c); opacity: var(--o); transform: rotateY(var(--r)); animation: var(--duration) ease infinite; }
                      .book-loader div ul li:nth-child(2) { --c: var(--page-fold); animation-name: page-2; }
                      .book-loader div ul li:nth-child(3) { --c: var(--page-fold); animation-name: page-3; }
                      .book-loader div ul li:nth-child(4) { --c: var(--page-fold); animation-name: page-4; }
                      .book-loader div ul li:nth-child(5) { --c: var(--page-fold); animation-name: page-5; }
                      .book-loader div ul li svg { width: 90px; height: 120px; display: block; }
                      .book-loader div ul li:first-child { --r: 0deg; --o: 1; }
                      .book-loader div ul li:last-child { --o: 1; }
                      .book-loader span { display: block; left: 0; right: 0; top: 100%; margin-top: 20px; text-align: center; color: var(--text); }
                      @keyframes page-2 { 0% { transform: rotateY(180deg); opacity: 0; } 20% { opacity: 1; } 35%, 100% { opacity: 0; } 50%, 100% { transform: rotateY(0deg); } }
                      @keyframes page-3 { 15% { transform: rotateY(180deg); opacity: 0; } 35% { opacity: 1; } 50%, 100% { opacity: 0; } 65%, 100% { transform: rotateY(0deg); } }
                      @keyframes page-4 { 30% { transform: rotateY(180deg); opacity: 0; } 50% { opacity: 1; } 65%, 100% { opacity: 0; } 80%, 100% { transform: rotateY(0deg); } }
                      @keyframes page-5 { 45% { transform: rotateY(180deg); opacity: 0; } 65% { opacity: 1; } 80%, 100% { opacity: 0; } 95%, 100% { transform: rotateY(0deg); } }
                    `}</style>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
                      <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                      <p className="text-red-700 font-medium mb-2">Preview Error</p>
                      <p className="text-sm text-red-600 mb-4">{error}</p>
                      <Button onClick={generatePreview} variant="outline" size="sm">Try Again</Button>
                    </div>
                  </div>
                ) : pdfUrl ? (
                  // PDF View - use highlighted PDF if available
                  <div className="flex flex-col items-center">
                    {highlightedPdfUrl && showAIPanel && (
                      <div className="mb-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        AI Highlights Applied to PDF
                      </div>
                    )}
                    <div
                      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                      className="transition-transform duration-200"
                    >
                      <iframe
                        ref={pdfIframeRef}
                        src={`${(highlightedPdfUrl && showAIPanel) ? highlightedPdfUrl : pdfUrl}#toolbar=0&navpanes=0`}
                        className="w-[595px] h-[842px] bg-white shadow-lg rounded"
                        title="Contract Preview"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {/* AI Insights Panel */}
              <AnimatePresence>
                {showAIPanel && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 340, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden"
                  >
                    {/* AI Panel Header */}
                    <div className="p-4 border-b border-gray-200 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-header">AI Insights</h3>
                        </div>
                        {annotations.length > 0 && (
                          <span className="text-xs text-body/50 bg-gray-100 px-2 py-1 rounded-full">
                            {annotations.length} found
                          </span>
                        )}
                      </div>
                      {/* AI Disclaimer */}
                      <div className="mt-2 flex items-center gap-1.5 text-amber-600 text-xs">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        <span>AI-generated, not legal advice</span>
                      </div>
                    </div>

                    {/* AI Content */}
                    <div className="flex-1 overflow-y-auto p-3">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="relative">
                            <div className="w-12 h-12 border-4 border-primary/20 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                          </div>
                          <p className="mt-4 text-body/60 text-sm">Analyzing contract...</p>
                        </div>
                      ) : aiError ? (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-red-700 mb-3">{aiError}</p>
                          <button
                            onClick={handleAnalyze}
                            className="text-sm text-red-600 underline hover:text-red-800"
                          >
                            Try again
                          </button>
                        </div>
                      ) : annotations.length > 0 ? (
                        <div className="space-y-3">
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
                                onClick={() => {
                                  navigateToPage(index)
                                }}
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

                                {/* Highlighted text preview */}
                                {annotation.highlighted_text && (
                                  <p className="mt-2 text-xs text-body/50 italic line-clamp-2">
                                    "{annotation.highlighted_text.substring(0, 80)}..."
                                  </p>
                                )}

                                {/* Page indicator */}
                                {pageInfo[index]?.page && (
                                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-xs text-body/40">
                                      📄 Page {pageInfo[index].page}
                                    </span>
                                    {pageInfo[index].found && (
                                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-600 rounded">
                                        ✓ Found
                                      </span>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-body/50">
                          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No important clauses detected</p>
                        </div>
                      )}
                    </div>

                    {/* Re-analyze button */}
                    {!isAnalyzing && (
                      <div className="p-3 border-t border-gray-200 bg-white">
                        <button
                          onClick={forceReanalyze}
                          className="w-full flex items-center justify-center gap-2 text-sm text-body/60 hover:text-primary transition-colors py-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Re-analyze
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-xs text-body/50">
                  This is a preview. Signatures will be added after verification.
                </p>
                <Button onClick={onClose}>Close Preview</Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
