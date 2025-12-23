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
  expectedChipId = null,
}) {
  const [status, setStatus] = useState('idle') // idle, scanning, success, error, mismatch
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)
  const [scannedData, setScannedData] = useState(null)
  const inputRef = useRef(null)
  const scanTimeoutRef = useRef(null)
  const capturedTextRef = useRef('')
  const isScanningRef = useRef(false)

  // Parse NFC data from the reader
  // The raw value from the NFC reader is the chip ID (e.g., 064240461207420740)
  // This is directly compared with the user's stored nfc_chip_id
  const parseNFCData = useCallback((rawText) => {
    // Remove any whitespace and special characters
    const cleaned = rawText.replace(/\s+/g, '').trim()

    // The cleaned raw value IS the NFC chip ID - no conversion needed
    if (!cleaned || cleaned.length < 10) {
      return null
    }

    return {
      cardType: 'MyKad',
      // The raw NFC chip ID read from the card - this is what we compare
      chipId: cleaned,
      timestamp: new Date().toISOString(),
    }
  }, [])

  // Handle input from keyboard emulation reader
  const handleInput = useCallback((e) => {
    if (!isScanningRef.current) return

    const value = e.target.value
    capturedTextRef.current = value

    // Update progress based on input length (NFC chip ID can vary in length)
    const progressValue = Math.min((value.length / 18) * 100, 95)
    setProgress(progressValue)

    // If we have enough characters, try to parse
    if (value.length >= 10) {
      // Wait a bit more in case reader is still typing
      clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = setTimeout(() => {
        const parsedData = parseNFCData(value)

        if (parsedData) {
          // Get the scanned NFC chip ID from the card
          const scannedChipId = parsedData.chipId

          // Validate against expected chip ID if provided (user's stored nfc_chip_id)
          if (expectedChipId) {
            // Compare the scanned chip ID with the user's stored nfc_chip_id
            if (scannedChipId !== expectedChipId) {
              isScanningRef.current = false
              setScannedData(parsedData)
              setStatus('mismatch')
              setErrorMessage(`NFC Chip ID mismatch! This card does not match your registered MyKad. Please use the correct card.`)
              onError?.({
                message: 'Card mismatch',
                expected: expectedChipId,
                scanned: scannedChipId
              })
              return
            }
          } else {
            // No expected chip ID stored - this is user's first time or chip ID not registered
            console.log('No expected chip ID provided. Scanned chip ID:', scannedChipId)
          }

          isScanningRef.current = false
          setScannedData(parsedData)
          setStatus('success')
          setProgress(100)

          // Clear the input
          if (inputRef.current) {
            inputRef.current.value = ''
          }

          // Call success callback with the scanned data
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
  }, [status, parseNFCData, onSuccess, onError, expectedChipId])

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
      if (isScanningRef.current && capturedTextRef.current.length < 10) {
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
                status === 'error' || status === 'mismatch' ? 'bg-status-breached' :
                  'gradient-primary'}
            `}
          >
            {status === 'success' ? (
              <CheckCircle className="h-16 w-16 text-white" />
            ) : status === 'error' || status === 'mismatch' ? (
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
                <span className="font-semibold">NFC Card Verified!</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-body/60">NFC Chip ID</span>
                  <span className="font-mono text-xs text-green-700 bg-green-100 px-2 py-1 rounded">{scannedData.chipId}</span>
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

        {status === 'mismatch' && (
          <motion.div
            key="mismatch"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm text-center"
          >
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700 mb-3">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Card Verification Failed</span>
              </div>
              <p className="text-sm text-red-600 mb-3">{errorMessage}</p>
              {scannedData && (
                <div className="text-left space-y-2 text-xs border-t border-red-200 pt-3 mt-3">
                  <div className="text-red-600">
                    <span className="text-red-500 font-medium block mb-1">Scanned NFC Chip ID:</span>
                    <span className="font-mono bg-red-100 px-2 py-1 rounded block break-all">{scannedData.chipId}</span>
                  </div>
                  {expectedChipId && (
                    <div className="text-red-600 pt-2 border-t border-red-200">
                      <span className="text-red-500 font-medium block mb-1">Your Registered Chip ID:</span>
                      <span className="font-mono bg-red-100 px-2 py-1 rounded block break-all">{expectedChipId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-sm text-body/60 mb-4">
              Please scan the MyKad that is registered to your account.
            </p>
            <Button onClick={handleRetry} variant="outline" icon={Nfc}>
              Scan Again
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

