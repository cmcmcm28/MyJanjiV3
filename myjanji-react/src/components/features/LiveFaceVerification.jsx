import { useRef, useEffect, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Loader2, ScanFace } from 'lucide-react'
import faceAuthService from '../../services/faceAuthService'

export default function LiveFaceVerification({
  onVerified,
  onError,
  interval = 1000, // Check every 1 second
  faceEmbedding = null, // Stored face embedding from Supabase
}) {
  const webcamRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState(null) // { success, message, score }
  const [isVerified, setIsVerified] = useState(false)
  const [hasPermission, setHasPermission] = useState(true)
  const intervalRef = useRef(null)

  const verifyFrame = useCallback(async () => {
    if (!webcamRef.current || isVerified || !isScanning) return

    try {
      const imageSrc = webcamRef.current.getScreenshot()
      if (!imageSrc) return

      // Use verifyLogin with stored embedding if provided (compares with database)
      // Otherwise fallback to verifyFrame (legacy behavior)
      let result
      if (faceEmbedding) {
        result = await faceAuthService.verifyLogin(imageSrc, faceEmbedding)
      } else {
        console.warn('⚠️ No face embedding provided, using legacy verifyFrame')
        result = await faceAuthService.verifyFrame(imageSrc)
      }

      if (result.success) {
        setIsVerified(true)
        setIsScanning(false)
        setVerificationStatus({
          success: true,
          message: result.message || 'Face verified successfully!',
          score: result.score,
        })
        onVerified?.(result)
      } else if (result.status === 'fail') {
        setVerificationStatus({
          success: false,
          message: result.message || 'Face mismatch detected',
          score: result.score,
        })
        onError?.(result)
      } else if (result.noFace) {
        setVerificationStatus({
          success: false,
          message: 'No face detected. Please position your face in the frame.',
          score: null,
        })
      } else {
        setVerificationStatus({
          success: false,
          message: result.message || 'Verification in progress...',
          score: null,
        })
      }
    } catch (error) {
      console.error('Face verification error:', error)
      setVerificationStatus({
        success: false,
        message: 'Error verifying face. Please try again.',
        score: null,
      })
    }
  }, [isVerified, isScanning, onVerified, onError, faceEmbedding])

  useEffect(() => {
    if (isScanning && !isVerified) {
      // Start continuous verification
      intervalRef.current = setInterval(verifyFrame, interval)
    } else {
      // Stop verification
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isScanning, isVerified, interval, verifyFrame])

  const handleStartScanning = () => {
    setIsScanning(true)
    setVerificationStatus(null)
    setIsVerified(false)
  }

  const handleStopScanning = () => {
    setIsScanning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const handleUserMediaError = () => {
    setHasPermission(false)
    setIsScanning(false)
  }

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-2xl">
        <AlertCircle className="h-12 w-12 text-status-breached mb-4" />
        <h3 className="text-lg font-semibold text-header mb-2">Camera Access Required</h3>
        <p className="text-sm text-body/60 text-center mb-4">
          Please allow camera access to use face verification.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* Webcam View */}
      <div className="relative rounded-2xl overflow-hidden bg-black mb-4">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 480,
            height: 360,
            facingMode: 'user',
          }}
          className="w-full"
          onUserMediaError={handleUserMediaError}
        />

        {/* Face Guide Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-48 h-60 border-4 rounded-full transition-colors duration-300 ${isVerified
                ? 'border-green-500'
                : verificationStatus?.success === false && verificationStatus?.message?.includes('mismatch')
                  ? 'border-red-500'
                  : verificationStatus?.message?.includes('No face')
                    ? 'border-yellow-500'
                    : 'border-white/50'
              }`}
          />
        </div>

        {/* Scanning Animation */}
        {isScanning && !isVerified && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '100%' }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-x-0 h-1 bg-gradient-to-b from-transparent via-primary to-transparent"
          />
        )}

        {/* Success Overlay */}
        {isVerified && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-green-500/20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="bg-white rounded-full p-4"
            >
              <CheckCircle className="h-12 w-12 text-green-500" />
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Status Display */}
      <AnimatePresence mode="wait">
        {!isScanning && !isVerified && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center mb-4"
          >
            <ScanFace className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-header">Ready to verify</p>
            <p className="text-xs text-body/60 mt-1">
              Click start to begin live face verification
            </p>
          </motion.div>
        )}

        {isScanning && !isVerified && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`w-full max-w-sm p-4 rounded-xl mb-4 ${verificationStatus?.success === false && verificationStatus?.message?.includes('mismatch')
                ? 'bg-red-50 border border-red-200'
                : verificationStatus?.message?.includes('No face')
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
          >
            <div className="flex items-center gap-2 justify-center">
              {verificationStatus?.success === false && verificationStatus?.message?.includes('mismatch') ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    {verificationStatus.message}
                  </span>
                </>
              ) : verificationStatus?.message?.includes('No face') ? (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700">
                    {verificationStatus.message}
                  </span>
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <span className="text-sm font-medium text-blue-700">
                    {verificationStatus?.message || 'Scanning your face...'}
                  </span>
                </>
              )}
            </div>
            {verificationStatus?.score && (
              <p className="text-xs text-center mt-2 text-body/60">
                Match score: {verificationStatus.score}%
              </p>
            )}
          </motion.div>
        )}

        {isVerified && (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm p-4 bg-green-50 border border-green-200 rounded-xl mb-4"
          >
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {verificationStatus?.message || 'Face verified successfully!'}
              </span>
            </div>
            {verificationStatus?.score && (
              <p className="text-xs text-center mt-2 text-green-600">
                Match score: {verificationStatus.score}%
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {!isScanning && !isVerified && (
          <button
            onClick={handleStartScanning}
            className="px-6 py-3 gradient-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Start Verification
          </button>
        )}
        {isScanning && !isVerified && (
          <button
            onClick={handleStopScanning}
            className="px-6 py-3 bg-gray-200 text-body rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Stop Scanning
          </button>
        )}
      </div>

      <p className="text-xs text-body/40 mt-4 text-center max-w-xs">
        Position your face within the oval guide. Verification runs automatically.
      </p>
    </div>
  )
}

