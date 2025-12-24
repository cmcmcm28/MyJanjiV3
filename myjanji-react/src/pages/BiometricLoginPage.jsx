import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanFace,
  Fingerprint,
  Shield,
  CheckCircle,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import WebcamCapture from '../components/features/WebcamCapture'
import faceAuthService from '../services/faceAuthService'

export default function BiometricLoginPage() {
  const navigate = useNavigate()
  const { login, availableUsers, verifyFace: setFaceVerified } = useAuth()

  const [authMethod, setAuthMethod] = useState(null) // 'face' or 'fingerprint'
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [matchedUser, setMatchedUser] = useState(null)

  const handleVerifyFace = async (imageData) => {
    setIsVerifying(true)
    setVerificationResult(null)

    try {
      // Try to verify against each user's stored face embedding
      // Stop as soon as we find a match
      let verified = false
      let foundUser = null

      for (const user of availableUsers) {
        // Skip users without face embedding
        if (!user.faceEmbedding) continue

        // Use verifyLogin with stored embedding (faster - no DB lookup needed)
        const result = await faceAuthService.verifyLogin(imageData, user.faceEmbedding)

        if (result.success) {
          verified = true
          foundUser = user
          break // Stop immediately on first match
        }
      }

      if (verified && foundUser) {
        setVerificationResult({
          success: true,
          message: `Welcome back, ${foundUser.name}!`,
        })
        setMatchedUser(foundUser)
        setIsSuccess(true)
        login(foundUser.id)
        setFaceVerified()

        // Navigate after showing success
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      } else {
        // No match found
        setVerificationResult({
          success: false,
          message: 'Face not recognized. Please try again.',
        })
      }
    } catch (error) {
      console.error('Face verification error:', error)
      setVerificationResult({
        success: false,
        message: 'Verification failed. Please try again.',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleFingerprintAuth = async () => {
    // Simulate fingerprint authentication
    setIsVerifying(true)
    setAuthMethod('fingerprint')

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Demo: Always succeed and use first user
    const demoUser = availableUsers[0]
    setVerificationResult({
      success: true,
      message: `Welcome back, ${demoUser.name}!`,
    })
    setMatchedUser(demoUser)
    setIsSuccess(true)
    login(demoUser.id)
    setFaceVerified()

    setIsVerifying(false)

    setTimeout(() => {
      navigate('/dashboard')
    }, 2000)
  }

  return (
    <div className="min-h-screen gradient-background flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center">
        <button
          onClick={() => navigate('/login')}
          className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-header" />
        </button>
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center px-4 mb-6"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="gradient-primary p-2.5 rounded-xl">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-header">MyJanji</h1>
        </div>
        <p className="text-body/60 text-sm">Biometric Authentication</p>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-6">
        <AnimatePresence mode="wait">
          {/* Success State */}
          {isSuccess && matchedUser ? (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <Card className="max-w-md mx-auto text-center" padding="xl">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                >
                  <div className="w-20 h-20 bg-status-ongoing rounded-full mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                </motion.div>

                <h2 className="text-2xl font-bold text-status-ongoing mb-2">
                  Authentication Successful!
                </h2>
                <p className="text-body/60 mb-6">
                  Welcome back, {matchedUser.name}
                </p>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <img
                    src={matchedUser.avatar}
                    alt={matchedUser.name}
                    className="w-20 h-20 rounded-xl mx-auto mb-3 object-cover"
                  />
                  <p className="font-semibold text-header">{matchedUser.name}</p>
                  <p className="text-sm text-body/50">IC: {matchedUser.ic}</p>
                </div>

                <p className="text-sm text-body/50">Redirecting to dashboard...</p>
                <div className="flex justify-center mt-4">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              </Card>
            </motion.div>
          ) : authMethod === 'face' ? (
            /* Face Recognition */
            <motion.div
              key="face"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="max-w-md mx-auto" padding="lg">
                <div className="text-center mb-6">
                  <ScanFace className="h-12 w-12 text-primary mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-header mb-2">Face Recognition</h2>
                  <p className="text-body/60 text-sm">
                    Position your face in the frame to log in
                  </p>
                </div>

                <WebcamCapture
                  onCapture={() => { }}
                  onVerify={handleVerifyFace}
                  isVerifying={isVerifying}
                  verificationResult={verificationResult}
                />

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setAuthMethod(null)}
                    className="text-sm text-body/50 hover:text-primary transition-colors"
                  >
                    Choose different method
                  </button>
                </div>
              </Card>
            </motion.div>
          ) : authMethod === 'fingerprint' ? (
            /* Fingerprint */
            <motion.div
              key="fingerprint"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="max-w-md mx-auto text-center" padding="xl">
                <motion.div
                  animate={isVerifying ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${isVerifying ? 'bg-primary/20' : 'bg-gray-100'
                    }`}>
                    <Fingerprint className={`h-12 w-12 ${isVerifying ? 'text-primary' : 'text-body/40'}`} />
                  </div>
                </motion.div>

                <h2 className="text-xl font-bold text-header mb-2">Fingerprint Login</h2>
                <p className="text-body/60 text-sm mb-6">
                  {isVerifying
                    ? 'Scanning fingerprint...'
                    : 'Touch the fingerprint sensor to authenticate'}
                </p>

                {!isVerifying && (
                  <Button
                    onClick={handleFingerprintAuth}
                    icon={Fingerprint}
                    fullWidth
                  >
                    Scan Fingerprint
                  </Button>
                )}

                {isVerifying && (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">Verifying...</span>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => setAuthMethod(null)}
                    className="text-sm text-body/50 hover:text-primary transition-colors"
                    disabled={isVerifying}
                  >
                    Choose different method
                  </button>
                </div>
              </Card>
            </motion.div>
          ) : (
            /* Method Selection */
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="max-w-md mx-auto" padding="lg">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-header mb-2">
                    Choose Authentication Method
                  </h2>
                  <p className="text-body/60 text-sm">
                    Select how you want to verify your identity
                  </p>
                </div>

                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAuthMethod('face')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-primary/30 bg-white text-left transition-all"
                  >
                    <div className="gradient-primary p-3 rounded-xl">
                      <ScanFace className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-header">Face Recognition</p>
                      <p className="text-sm text-body/60">Use your face to log in</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAuthMethod('fingerprint')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-primary/30 bg-white text-left transition-all"
                  >
                    <div className="bg-secondary p-3 rounded-xl">
                      <Fingerprint className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-header">Fingerprint</p>
                      <p className="text-sm text-body/60">Use your fingerprint sensor</p>
                    </div>
                  </motion.button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                  <p className="text-xs text-body/40 mb-3">Or sign in with IC</p>
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => navigate('/login')}
                  >
                    Use IC Login
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-body/40">
        <p>Secured by MyJanji Biometric System</p>
      </div>
    </div>
  )
}

