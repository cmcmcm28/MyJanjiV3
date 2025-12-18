import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScanFace, Check, AlertCircle, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import WebcamCapture from '../components/features/WebcamCapture'
import faceAuthService from '../services/faceAuthService'

export default function FaceVerificationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, verifyFace: setFaceVerified } = useAuth()

  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Get the redirect path from location state or default to dashboard
  const redirectTo = location.state?.redirectTo || '/dashboard'
  const purpose = location.state?.purpose || 'verification'

  const handleVerifyFace = async (imageData) => {
    setIsVerifying(true)
    setVerificationResult(null)

    try {
      const result = await faceAuthService.verifyFace(currentUser?.id, imageData)

      setVerificationResult({
        success: result.success,
        message: result.message,
      })

      if (result.success) {
        setIsSuccess(true)
        setFaceVerified()

        // Navigate after showing success
        setTimeout(() => {
          navigate(redirectTo)
        }, 2000)
      }
    } catch (error) {
      setVerificationResult({
        success: false,
        message: 'Verification failed. Please try again.',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSkip = () => {
    // Demo mode - skip verification
    setFaceVerified()
    navigate(redirectTo)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Face Verification" showBack />

      <div className="px-4 py-6">
        {/* Info Card */}
        <Card className="mb-6 bg-primary/5 border border-primary/20" padding="md">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-header text-sm">Secure Verification</h3>
              <p className="text-xs text-body/60 mt-1">
                {purpose === 'registration'
                  ? 'Register your face for future biometric authentication.'
                  : 'Verify your identity to proceed with this action.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Main Verification Card */}
        {isSuccess ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Card className="text-center" padding="xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
              >
                <div className="w-20 h-20 bg-status-ongoing rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Check className="h-10 w-10 text-white" />
                </div>
              </motion.div>

              <h2 className="text-2xl font-bold text-status-ongoing mb-2">
                Verification Successful!
              </h2>
              <p className="text-body/60 mb-4">
                Your identity has been verified.
              </p>

              {currentUser && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-16 h-16 rounded-xl mx-auto mb-3 object-cover"
                  />
                  <p className="font-semibold text-header">{currentUser.name}</p>
                  <p className="text-sm text-body/50">IC: {currentUser.ic}</p>
                </div>
              )}

              <p className="text-sm text-body/50">Redirecting...</p>
              <div className="flex justify-center mt-4">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </Card>
          </motion.div>
        ) : (
          <Card padding="lg">
            <div className="text-center mb-6">
              <ScanFace className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-header mb-2">
                {purpose === 'registration' ? 'Register Your Face' : 'Verify Your Identity'}
              </h2>
              <p className="text-body/60 text-sm">
                Position your face clearly in the camera frame
              </p>
            </div>

            {/* User Info */}
            {currentUser && (
              <div className="bg-blue-50 rounded-xl p-3 mb-6 flex items-center gap-3 border border-blue-100">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-header">
                    Verifying as: {currentUser.name}
                  </p>
                  <p className="text-xs text-body/50">IC: {currentUser.ic}</p>
                </div>
              </div>
            )}

            {/* Webcam */}
            <WebcamCapture
              onCapture={() => {}}
              onVerify={handleVerifyFace}
              isVerifying={isVerifying}
              verificationResult={verificationResult}
            />

            {/* Tips */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-body/50 mb-3">Tips for best results:</p>
              <ul className="text-xs text-body/50 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Ensure good lighting on your face
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Remove glasses or face coverings
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Look directly at the camera
                </li>
              </ul>
            </div>

            {/* Demo Skip */}
            <div className="mt-6 text-center">
              <button
                onClick={handleSkip}
                className="text-sm text-body/40 hover:text-primary transition-colors"
              >
                Skip for demo
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

