import { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, RotateCcw, Check, AlertCircle, Loader2 } from 'lucide-react'
import Button from '../ui/Button'

const videoConstraints = {
  width: 480,
  height: 360,
  facingMode: 'user',
}

export default function WebcamCapture({
  onCapture,
  onVerify,
  isVerifying = false,
  verificationResult = null,
  showOverlay = true,
}) {
  const webcamRef = useRef(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [hasPermission, setHasPermission] = useState(true)

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setCapturedImage(imageSrc)
      onCapture?.(imageSrc)
    }
  }, [onCapture])

  const retake = () => {
    setCapturedImage(null)
  }

  const handleVerify = () => {
    if (capturedImage) {
      onVerify?.(capturedImage)
    }
  }

  const handleUserMediaError = () => {
    setHasPermission(false)
  }

  if (!hasPermission) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-2xl"
      >
        <AlertCircle className="h-12 w-12 text-status-breached mb-4" />
        <h3 className="text-lg font-semibold text-header mb-2">Camera Access Required</h3>
        <p className="text-sm text-body/60 text-center">
          Please allow camera access to use face verification.
        </p>
        <Button
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center"
    >
      <div className="relative rounded-2xl overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          {capturedImage ? (
            <motion.img
              key="captured"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={capturedImage}
              alt="Captured face"
              className="w-full h-auto"
              style={{ maxWidth: 480 }}
            />
          ) : (
            <motion.div
              key="webcam"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                onUserMediaError={handleUserMediaError}
                className="w-full h-auto"
                style={{ maxWidth: 480 }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Face overlay guide */}
        {showOverlay && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-60 border-4 border-white/50 rounded-full" />
          </div>
        )}

        {/* Scanning effect */}
        {isVerifying && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-x-0 h-1 bg-gradient-to-b from-transparent via-primary to-transparent"
          />
        )}
      </div>

      {/* Verification result */}
      <AnimatePresence>
        {verificationResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              mt-4 px-4 py-2 rounded-lg flex items-center gap-2
              ${verificationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
            `}
          >
            {verificationResult.success ? (
              <Check className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="font-medium">{verificationResult.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center gap-3 mt-4">
        {capturedImage ? (
          <>
            <Button
              variant="outline"
              onClick={retake}
              icon={RotateCcw}
              disabled={isVerifying}
            >
              Retake
            </Button>
            <Button
              onClick={handleVerify}
              icon={isVerifying ? Loader2 : Check}
              loading={isVerifying}
            >
              {isVerifying ? 'Verifying...' : 'Verify Face'}
            </Button>
          </>
        ) : (
          <Button
            onClick={capture}
            icon={Camera}
            size="lg"
          >
            Capture Photo
          </Button>
        )}
      </div>

      <p className="text-xs text-body/40 mt-4 text-center max-w-xs">
        Position your face within the oval and ensure good lighting for best results.
      </p>
    </motion.div>
  )
}

