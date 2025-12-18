import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Nfc, 
  Smartphone, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  CreditCard,
  Wifi
} from 'lucide-react'
import Button from '../ui/Button'

export default function NFCScanner({
  onSuccess,
  onError,
  onSkip,
  title = 'Scan Your MyKad',
  description = 'Click Start, then place your MyKad on the R20C-USB reader',
  allowSkip = true,
}) {
  const [status, setStatus] = useState('idle') // idle, scanning, success, error
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)
  const [scannedData, setScannedData] = useState(null)
  const inputRef = useRef(null)
  const scanTimeoutRef = useRef(null)
  const capturedTextRef = useRef('')
  const isScanningRef = useRef(false)

  // Parse IC number and extract data
  const parseNFCData = useCallback((rawText) => {
    // Remove any whitespace and special characters
    const cleaned = rawText.replace(/\s+/g, '').trim()
    
    // Try to find IC number pattern (12 digits with optional dashes: YYMMDD-PB-G###)
    const icPattern = /(\d{6}[-]?\d{2}[-]?\d{4})/
    const icMatch = cleaned.match(icPattern)
    
    if (!icMatch) {
      return null
    }

    const icNumber = icMatch[1].replace(/-/g, '')
    
    if (icNumber.length !== 12) {
      return null
    }

    // Parse date of birth from IC number (format: YYMMDD)
    let dateOfBirth = null
    try {
      const year = parseInt(icNumber.substring(0, 2))
      const month = parseInt(icNumber.substring(2, 4))
      const day = parseInt(icNumber.substring(4, 6))
      // Determine century (00-30 = 2000-2030, 31-99 = 1931-1999)
      const fullYear = year <= 30 ? 2000 + year : 1900 + year
      dateOfBirth = `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    } catch (e) {
      console.error('Error parsing date:', e)
    }

    // Extract gender from last digit (odd = male, even = female)
    const lastDigit = parseInt(icNumber[11])
    const gender = lastDigit % 2 === 1 ? 'M' : 'F'

    // Format IC number with dashes
    const formattedIC = `${icNumber.substring(0, 6)}-${icNumber.substring(6, 8)}-${icNumber.substring(8, 12)}`

    return {
      cardType: 'MyKad',
      icNumber: formattedIC,
      name: 'SCANNED FROM CARD', // Name would need to be read from card if available
      address: 'SCANNED FROM CARD', // Address would need to be read from card if available
      dateOfBirth,
      gender,
      citizenship: 'WARGANEGARA',
      issueDate: null,
      expiryDate: null,
      chipId: `MYK${icNumber.substring(8, 12)}`,
      timestamp: new Date().toISOString(),
    }
  }, [])

  // Handle input from keyboard emulation reader
  const handleInput = useCallback((e) => {
    if (!isScanningRef.current) return

    const value = e.target.value
    capturedTextRef.current = value

    // Update progress based on input length (assuming IC number is 12 digits)
    const progressValue = Math.min((value.length / 12) * 100, 95)
    setProgress(progressValue)

    // If we have enough characters, try to parse
    if (value.length >= 12) {
      // Wait a bit more in case reader is still typing
      clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = setTimeout(() => {
        const parsedData = parseNFCData(value)
        
        if (parsedData) {
          isScanningRef.current = false
          setScannedData(parsedData)
          setStatus('success')
          setProgress(100)
          
          // Clear the input
          if (inputRef.current) {
            inputRef.current.value = ''
          }
          
          // Call success callback
          setTimeout(() => {
            onSuccess?.(parsedData)
          }, 1000)
        } else {
          isScanningRef.current = false
          setStatus('error')
          setErrorMessage('Failed to parse card data. Please try scanning again.')
          onError?.({ message: 'Invalid card data format' })
        }
      }, 500) // Wait 500ms after last character
    }
  }, [status, parseNFCData, onSuccess, onError])

  // Start scanning - focus hidden input to capture keyboard input
  const startScanning = useCallback(() => {
    setStatus('scanning')
    setProgress(0)
    setErrorMessage(null)
    setScannedData(null)
    capturedTextRef.current = ''
    isScanningRef.current = true

    // Focus the hidden input field to capture keyboard input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.value = ''
      }
    }, 100)

    // Set timeout in case no input is received
    clearTimeout(scanTimeoutRef.current)
    scanTimeoutRef.current = setTimeout(() => {
      if (isScanningRef.current && capturedTextRef.current.length < 12) {
        isScanningRef.current = false
        setStatus('error')
        setErrorMessage('No card detected. Please place your MyKad on the reader and try again.')
        onError?.({ message: 'Scan timeout' })
      }
    }, 10000) // 10 second timeout
  }, [onError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(scanTimeoutRef.current)
    }
  }, [])

  const handleRetry = () => {
    isScanningRef.current = false
    setStatus('idle')
    setProgress(0)
    setErrorMessage(null)
    setScannedData(null)
    capturedTextRef.current = ''
    clearTimeout(scanTimeoutRef.current)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center"
    >
      {/* Hidden input field to capture keyboard emulation */}
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        style={{
          position: 'absolute',
          left: '-9999px',
          opacity: 0,
          pointerEvents: status === 'scanning' ? 'auto' : 'none',
        }}
        onInput={handleInput}
        onKeyDown={(e) => {
          // Prevent default behavior for Enter key
          if (e.key === 'Enter') {
            e.preventDefault()
          }
        }}
        placeholder=""
        tabIndex={status === 'scanning' ? 0 : -1}
      />

      {/* Title */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-header mb-2">{title}</h3>
        <p className="text-body/60 text-sm">{description}</p>
      </div>

      {/* NFC Animation Area */}
      <div className="relative w-64 h-64 mb-6">
        {/* Background circle */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10" />
        
        {/* Scanning rings animation */}
        <AnimatePresence>
          {status === 'scanning' && (
            <>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.4,
                  }}
                  className="absolute inset-0 rounded-full border-2 border-primary/40"
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={status === 'scanning' ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: status === 'scanning' ? Infinity : 0 }}
            className={`
              w-32 h-32 rounded-full flex items-center justify-center
              ${status === 'success' ? 'bg-status-ongoing' : 
                status === 'error' ? 'bg-status-breached' : 
                'gradient-primary'}
            `}
          >
            {status === 'success' ? (
              <CheckCircle className="h-16 w-16 text-white" />
            ) : status === 'error' ? (
              <AlertCircle className="h-16 w-16 text-white" />
            ) : status === 'scanning' ? (
              <Wifi className="h-16 w-16 text-white animate-pulse" />
            ) : (
              <Nfc className="h-16 w-16 text-white" />
            )}
          </motion.div>
        </div>

        {/* MyKad illustration */}
        {status === 'idle' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2"
          >
            <div className="relative">
              <CreditCard className="h-20 w-32 text-primary/30" />
              <motion.div
                animate={{ y: [-2, 2, -2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="text-xs text-primary font-medium">MyKad</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Progress bar */}
      {status === 'scanning' && (
        <div className="w-full max-w-xs mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full gradient-primary"
            />
          </div>
          <p className="text-center text-sm text-body/60 mt-2">
            Reading NFC chip... {progress}%
          </p>
        </div>
      )}

      {/* Status messages */}
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <Button 
              onClick={startScanning} 
              icon={Nfc} 
              size="lg"
            >
              Start NFC Scan
            </Button>
            <p className="text-xs text-body/40 mt-4">
              Place your MyKad on the R20C-USB reader after clicking Start
            </p>
          </motion.div>
        )}

        {status === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-medium">Scanning MyKad...</span>
            </div>
            <p className="text-xs text-body/40 mt-2">
              Place your MyKad on the R20C-USB reader now...
            </p>
          </motion.div>
        )}

        {status === 'success' && scannedData && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm"
          >
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-green-700 mb-3">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">MyKad Verified!</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-body/60">Name</span>
                  <span className="font-medium text-header">{scannedData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-body/60">IC Number</span>
                  <span className="font-medium text-header">{scannedData.icNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-body/60">Chip ID</span>
                  <span className="font-mono text-xs text-body/50">{scannedData.chipId}</span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-body/60">
              Proceeding to face verification...
            </p>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            </div>
            <Button onClick={handleRetry} variant="outline">
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip option */}
      {allowSkip && status === 'idle' && (
        <div className="mt-6 pt-4 border-t border-gray-100 w-full text-center">
          <button
            onClick={onSkip}
            className="text-sm text-body/40 hover:text-primary transition-colors"
          >
            Skip for demo
          </button>
        </div>
      )}
    </motion.div>
  )
}

