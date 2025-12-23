import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, FileText, Download, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react'
import Button from '../ui/Button'
import pdfService from '../../services/pdfService'

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
  useBackend = true, // NEW: Use Python backend for preview by default
}) {
  const [pdfUrl, setPdfUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    if (isOpen) {
      generatePreview()
    }
    return () => {
      // Cleanup URL when modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [isOpen, contract, templateType, formData])

  const generatePreview = async () => {
    setLoading(true)
    setError(null)

    try {
      let result

      // Use Python backend for dynamic template preview
      if (useBackend && templateType) {
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

  // NEW: Generate preview using Python backend (fetches from Supabase templates)
  const generateBackendPreview = async () => {
    try {
      // Build placeholders from formData
      const placeholders = buildPlaceholders(formData, creator, acceptee)
      
      console.log('Sending to backend:', { template_name: templateType, placeholders })

      const response = await fetch(`${BACKEND_URL}/preview_contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_name: templateType,
          placeholders: placeholders,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Backend error: ${response.status}`)
      }

      // Get PDF blob and create URL
      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      
      return { success: true, url }
    } catch (err) {
      console.error('Backend preview error:', err)
      // Fallback to local generation if backend fails
      console.log('⚠️ Backend failed, falling back to local PDF generation')
      return await pdfService.generateTemplatedPDF(templateType, formData, {
        creator,
        acceptee,
        includeSignatures: false,
      })
    }
  }

  // Build placeholders object from form data
  const buildPlaceholders = (formData, creator, acceptee) => {
    return {
      // Parties
      CREATOR_NAME: creator?.name || formData?.creatorName || '',
      CREATOR_IC: creator?.ic || formData?.creatorIc || '',
      ACCEPTEE_NAME: acceptee?.name || formData?.accepteeName || '',
      ACCEPTEE_IC: acceptee?.ic || formData?.accepteeIc || '',
      
      // Dates
      START_DATE: formatDate(formData?.startDate),
      END_DATE: formatDate(formData?.endDate || formData?.returnDate || formData?.dueDate),
      RETURN_DATE: formatDate(formData?.returnDate || formData?.dueDate),
      DUE_DATE: formatDate(formData?.dueDate),
      CONTRACT_DATE: formatDate(new Date()),
      
      // Items/Assets
      ITEM_NAME: formData?.item || formData?.itemName || formData?.name || '',
      ITEM_DESCRIPTION: formData?.description || formData?.itemDescription || '',
      ITEM_CONDITION: formData?.condition || formData?.itemCondition || 'Good',
      ITEM_VALUE: formData?.value || formData?.estimatedValue || '',
      
      // Money
      AMOUNT: formData?.amount || formData?.loanAmount || '',
      INTEREST_RATE: formData?.interestRate || '0',
      PAYMENT_TERMS: formData?.paymentTerms || '',
      
      // Vehicle specific
      VEHICLE_MODEL: formData?.vehicleModel || formData?.model || '',
      VEHICLE_PLATE: formData?.vehiclePlate || formData?.plateNumber || '',
      VEHICLE_COLOR: formData?.vehicleColor || formData?.color || '',
      
      // Additional
      TERMS: formData?.terms || formData?.additionalTerms || '',
      NOTES: formData?.notes || '',
      LOCATION: formData?.location || '',
      
      // Spread any additional form data
      ...formData,
    }
  }

  // Helper to format dates
  const formatDate = (date) => {
    if (!date) return ''
    try {
      const d = new Date(date)
      return d.toLocaleDateString('en-MY', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      })
    } catch {
      return String(date)
    }
  }

  const handleDownload = async () => {
    if (contract) {
      await pdfService.downloadContractPDF(contract, creator, acceptee, {
        templateType,
        formData,
      })
    } else {
      const result = await pdfService.generateTemplatedPDF(templateType, formData, {
        creator,
        acceptee,
      })
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
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

                {/* Download button */}
                {allowDownload && pdfUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    icon={Download}
                  >
                    Download
                  </Button>
                )}

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <X className="h-5 w-5 text-body" />
                </button>
              </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
                  {/* Book Loader Animation */}
                  <div className="book-loader">
                    <div>
                      <ul>
                        <li>
                          <svg fill="currentColor" viewBox="0 0 90 120">
                            <path d="M90,0 L90,120 L11,120 C4.92486775,120 0,115.075132 0,109 L0,11 C0,4.92486775 4.92486775,0 11,0 L90,0 Z M71.5,81 L18.5,81 C17.1192881,81 16,82.1192881 16,83.5 C16,84.8254834 17.0315359,85.9100387 18.3356243,85.9946823 L18.5,86 L71.5,86 C72.8807119,86 74,84.8807119 74,83.5 C74,82.1745166 72.9684641,81.0899613 71.6643757,81.0053177 L71.5,81 Z M71.5,57 L18.5,57 C17.1192881,57 16,58.1192881 16,59.5 C16,60.8254834 17.0315359,61.9100387 18.3356243,61.9946823 L18.5,62 L71.5,62 C72.8807119,62 74,60.8807119 74,59.5 C74,58.1745166 72.9684641,57.0899613 71.6643757,57.0053177 L71.5,57 Z M71.5,33 L18.5,33 C17.1192881,33 16,34.1192881 16,35.5 C16,36.8254834 17.0315359,37.9100387 18.3356243,37.9946823 L18.5,38 L71.5,38 C72.8807119,38 74,36.8807119 74,35.5 C74,34.1745166 72.9684641,33.0899613 71.6643757,33.0053177 L71.5,33 Z"></path>
                          </svg>
                        </li>
                        <li>
                          <svg fill="currentColor" viewBox="0 0 90 120">
                            <path d="M90,0 L90,120 L11,120 C4.92486775,120 0,115.075132 0,109 L0,11 C0,4.92486775 4.92486775,0 11,0 L90,0 Z M71.5,81 L18.5,81 C17.1192881,81 16,82.1192881 16,83.5 C16,84.8254834 17.0315359,85.9100387 18.3356243,85.9946823 L18.5,86 L71.5,86 C72.8807119,86 74,84.8807119 74,83.5 C74,82.1745166 72.9684641,81.0899613 71.6643757,81.0053177 L71.5,81 Z M71.5,57 L18.5,57 C17.1192881,57 16,58.1192881 16,59.5 C16,60.8254834 17.0315359,61.9100387 18.3356243,61.9946823 L18.5,62 L71.5,62 C72.8807119,62 74,60.8807119 74,59.5 C74,58.1745166 72.9684641,57.0899613 71.6643757,57.0053177 L71.5,57 Z M71.5,33 L18.5,33 C17.1192881,33 16,34.1192881 16,35.5 C16,36.8254834 17.0315359,37.9100387 18.3356243,37.9946823 L18.5,38 L71.5,38 C72.8807119,38 74,36.8807119 74,35.5 C74,34.1745166 72.9684641,33.0899613 71.6643757,33.0053177 L71.5,33 Z"></path>
                          </svg>
                        </li>
                        <li>
                          <svg fill="currentColor" viewBox="0 0 90 120">
                            <path d="M90,0 L90,120 L11,120 C4.92486775,120 0,115.075132 0,109 L0,11 C0,4.92486775 4.92486775,0 11,0 L90,0 Z M71.5,81 L18.5,81 C17.1192881,81 16,82.1192881 16,83.5 C16,84.8254834 17.0315359,85.9100387 18.3356243,85.9946823 L18.5,86 L71.5,86 C72.8807119,86 74,84.8807119 74,83.5 C74,82.1745166 72.9684641,81.0899613 71.6643757,81.0053177 L71.5,81 Z M71.5,57 L18.5,57 C17.1192881,57 16,58.1192881 16,59.5 C16,60.8254834 17.0315359,61.9100387 18.3356243,61.9946823 L18.5,62 L71.5,62 C72.8807119,62 74,60.8807119 74,59.5 C74,58.1745166 72.9684641,57.0899613 71.6643757,57.0053177 L71.5,57 Z M71.5,33 L18.5,33 C17.1192881,33 16,34.1192881 16,35.5 C16,36.8254834 17.0315359,37.9100387 18.3356243,37.9946823 L18.5,38 L71.5,38 C72.8807119,38 74,36.8807119 74,35.5 C74,34.1745166 72.9684641,33.0899613 71.6643757,33.0053177 L71.5,33 Z"></path>
                          </svg>
                        </li>
                        <li>
                          <svg fill="currentColor" viewBox="0 0 90 120">
                            <path d="M90,0 L90,120 L11,120 C4.92486775,120 0,115.075132 0,109 L0,11 C0,4.92486775 4.92486775,0 11,0 L90,0 Z M71.5,81 L18.5,81 C17.1192881,81 16,82.1192881 16,83.5 C16,84.8254834 17.0315359,85.9100387 18.3356243,85.9946823 L18.5,86 L71.5,86 C72.8807119,86 74,84.8807119 74,83.5 C74,82.1745166 72.9684641,81.0899613 71.6643757,81.0053177 L71.5,81 Z M71.5,57 L18.5,57 C17.1192881,57 16,58.1192881 16,59.5 C16,60.8254834 17.0315359,61.9100387 18.3356243,61.9946823 L18.5,62 L71.5,62 C72.8807119,62 74,60.8807119 74,59.5 C74,58.1745166 72.9684641,57.0899613 71.6643757,57.0053177 L71.5,57 Z M71.5,33 L18.5,33 C17.1192881,33 16,34.1192881 16,35.5 C16,36.8254834 17.0315359,37.9100387 18.3356243,37.9946823 L18.5,38 L71.5,38 C72.8807119,38 74,36.8807119 74,35.5 C74,34.1745166 72.9684641,33.0899613 71.6643757,33.0053177 L71.5,33 Z"></path>
                          </svg>
                        </li>
                        <li>
                          <svg fill="currentColor" viewBox="0 0 90 120">
                            <path d="M90,0 L90,120 L11,120 C4.92486775,120 0,115.075132 0,109 L0,11 C0,4.92486775 4.92486775,0 11,0 L90,0 Z M71.5,81 L18.5,81 C17.1192881,81 16,82.1192881 16,83.5 C16,84.8254834 17.0315359,85.9100387 18.3356243,85.9946823 L18.5,86 L71.5,86 C72.8807119,86 74,84.8807119 74,83.5 C74,82.1745166 72.9684641,81.0899613 71.6643757,81.0053177 L71.5,81 Z M71.5,57 L18.5,57 C17.1192881,57 16,58.1192881 16,59.5 C16,60.8254834 17.0315359,61.9100387 18.3356243,61.9946823 L18.5,62 L71.5,62 C72.8807119,62 74,60.8807119 74,59.5 C74,58.1745166 72.9684641,57.0899613 71.6643757,57.0053177 L71.5,57 Z M71.5,33 L18.5,33 C17.1192881,33 16,34.1192881 16,35.5 C16,36.8254834 17.0315359,37.9100387 18.3356243,37.9946823 L18.5,38 L71.5,38 C72.8807119,38 74,36.8807119 74,35.5 C74,34.1745166 72.9684641,33.0899613 71.6643757,33.0053177 L71.5,33 Z"></path>
                          </svg>
                        </li>
                      </ul>
                    </div>
                    <span>Generating preview...</span>
                  </div>
                  
                  {/* Book Loader Styles */}
                  <style>{`
                    .book-loader {
                      --background: linear-gradient(135deg, #23C4F8, #275EFE);
                      --shadow: rgba(39, 94, 254, 0.28);
                      --text: #6C7486;
                      --page: rgba(255, 255, 255, 0.36);
                      --page-fold: rgba(255, 255, 255, 0.52);
                      --duration: 3s;
                      width: 200px;
                      height: 140px;
                      position: relative;
                    }
                    .book-loader:before, .book-loader:after {
                      --r: -6deg;
                      content: "";
                      position: absolute;
                      bottom: 8px;
                      width: 120px;
                      top: 80%;
                      box-shadow: 0 16px 12px var(--shadow);
                      transform: rotate(var(--r));
                    }
                    .book-loader:before {
                      left: 4px;
                    }
                    .book-loader:after {
                      --r: 6deg;
                      right: 4px;
                    }
                    .book-loader div {
                      width: 100%;
                      height: 100%;
                      border-radius: 13px;
                      position: relative;
                      z-index: 1;
                      perspective: 600px;
                      box-shadow: 0 4px 6px var(--shadow);
                      background-image: var(--background);
                    }
                    .book-loader div ul {
                      margin: 0;
                      padding: 0;
                      list-style: none;
                      position: relative;
                    }
                    .book-loader div ul li {
                      --r: 180deg;
                      --o: 0;
                      --c: var(--page);
                      position: absolute;
                      top: 10px;
                      left: 10px;
                      transform-origin: 100% 50%;
                      color: var(--c);
                      opacity: var(--o);
                      transform: rotateY(var(--r));
                      animation: var(--duration) ease infinite;
                    }
                    .book-loader div ul li:nth-child(2) {
                      --c: var(--page-fold);
                      animation-name: page-2;
                    }
                    .book-loader div ul li:nth-child(3) {
                      --c: var(--page-fold);
                      animation-name: page-3;
                    }
                    .book-loader div ul li:nth-child(4) {
                      --c: var(--page-fold);
                      animation-name: page-4;
                    }
                    .book-loader div ul li:nth-child(5) {
                      --c: var(--page-fold);
                      animation-name: page-5;
                    }
                    .book-loader div ul li svg {
                      width: 90px;
                      height: 120px;
                      display: block;
                    }
                    .book-loader div ul li:first-child {
                      --r: 0deg;
                      --o: 1;
                    }
                    .book-loader div ul li:last-child {
                      --o: 1;
                    }
                    .book-loader span {
                      display: block;
                      left: 0;
                      right: 0;
                      top: 100%;
                      margin-top: 20px;
                      text-align: center;
                      color: var(--text);
                    }
                    @keyframes page-2 {
                      0% { transform: rotateY(180deg); opacity: 0; }
                      20% { opacity: 1; }
                      35%, 100% { opacity: 0; }
                      50%, 100% { transform: rotateY(0deg); }
                    }
                    @keyframes page-3 {
                      15% { transform: rotateY(180deg); opacity: 0; }
                      35% { opacity: 1; }
                      50%, 100% { opacity: 0; }
                      65%, 100% { transform: rotateY(0deg); }
                    }
                    @keyframes page-4 {
                      30% { transform: rotateY(180deg); opacity: 0; }
                      50% { opacity: 1; }
                      65%, 100% { opacity: 0; }
                      80%, 100% { transform: rotateY(0deg); }
                    }
                    @keyframes page-5 {
                      45% { transform: rotateY(180deg); opacity: 0; }
                      65% { opacity: 1; }
                      80%, 100% { opacity: 0; }
                      95%, 100% { transform: rotateY(0deg); }
                    }
                  `}</style>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
                    <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <p className="text-red-700 font-medium mb-2">Preview Error</p>
                    <p className="text-sm text-red-600 mb-4">{error}</p>
                    <Button onClick={generatePreview} variant="outline" size="sm">
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : pdfUrl ? (
                <div className="flex justify-center">
                  <div
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                    className="transition-transform duration-200"
                  >
                    <iframe
                      src={`${pdfUrl}#toolbar=0&navpanes=0`}
                      className="w-[595px] h-[842px] bg-white shadow-lg rounded"
                      title="Contract Preview"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-xs text-body/50">
                  This is a preview. Signatures will be added after verification.
                </p>
                <Button onClick={onClose}>
                  Close Preview
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

