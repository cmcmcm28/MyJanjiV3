import { useState, useEffect, useCallback } from 'react'
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
  description = 'Place your MyKad on the back of your device to verify your identity',
  allowSkip = true,
}) {
  const [status, setStatus] = useState('idle') // idle, scanning, success, error
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)
  const [scannedData, setScannedData] = useState(null)

  // Mock NFC scanning function
  const startScanning = useCallback(() => {
    setStatus('scanning')
    setProgress(0)
    setErrorMessage(null)

    // Simulate NFC scanning progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 10
      })
    }, 200)

    // Simulate NFC read after 2.5 seconds
    setTimeout(() => {
      clearInterval(progressInterval)
      setProgress(100)
      
      // Mock successful scan with dummy data
      const mockNfcData = {
        cardType: 'MyKad',
        icNumber: '901212-10-5599',
        name: 'SPONGEBOB BIN SQUAREPANTS',
        address: '124 CONCH STREET, BIKINI BOTTOM',
        dateOfBirth: '1990-12-12',
        gender: 'M',
        citizenship: 'WARGANEGARA',
        issueDate: '2020-01-15',
        expiryDate: '2030-01-14',
        chipId: 'MYK' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        timestamp: new Date().toISOString(),
      }

      setScannedData(mockNfcData)
      setStatus('success')
      
      // Call success callback after brief delay
      setTimeout(() => {
        onSuccess?.(mockNfcData)
      }, 1000)
    }, 2500)
  }, [onSuccess])

  // Simulate NFC error (for testing)
  const simulateError = useCallback(() => {
    setStatus('error')
    setErrorMessage('Failed to read NFC chip. Please try again.')
    onError?.({ message: 'NFC read failed' })
  }, [onError])

  const handleRetry = () => {
    setStatus('idle')
    setProgress(0)
    setErrorMessage(null)
    setScannedData(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center"
    >
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
            <Button onClick={startScanning} icon={Nfc} size="lg">
              Start NFC Scan
            </Button>
            <p className="text-xs text-body/40 mt-4">
              Make sure NFC is enabled on your device
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
              Keep your card steady on the device
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

