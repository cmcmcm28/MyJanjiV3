import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Webcam from 'react-webcam'
import {
  Smartphone,
  ScanFace,
  CheckCircle,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import faceAuthService from '../services/faceAuthService'
import { userService } from '../services/supabase/userService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const steps = [
  { id: 0, label: 'Tap NFC', icon: Smartphone },
  { id: 1, label: 'Face Scan', icon: ScanFace },
  { id: 2, label: 'Verified', icon: CheckCircle },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, availableUsers } = useAuth()
  const webcamRef = useRef(null)
  const nfcInputRef = useRef(null)

  const [currentStep, setCurrentStep] = useState(0)
  const [nfcChipId, setNfcChipId] = useState('')
  const [userData, setUserData] = useState(null)
  const [storedEmbedding, setStoredEmbedding] = useState(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanScore, setScanScore] = useState(null)
  const [backendOnline, setBackendOnline] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      const health = await faceAuthService.checkHealth()
      setBackendOnline(health.isOnline)
    }
    checkBackend()
  }, [])

  // Auto-focus NFC input when on step 0
  useEffect(() => {
    if (currentStep === 0 && nfcInputRef.current) {
      nfcInputRef.current.focus()
    }
  }, [currentStep])

  // Handle NFC chip ID lookup
  const handleNfcLookup = async () => {
    if (!nfcChipId.trim()) {
      setErrorMessage('Please tap your NFC card')
      return
    }

    setIsLookingUp(true)
    setErrorMessage(null)

    try {
      const searchValue = nfcChipId.trim()
      console.log('🔍 Searching for NFC chip ID:', searchValue)
      console.log('🔍 Value length:', searchValue.length)
      console.log('🔍 Value bytes:', [...searchValue].map(c => c.charCodeAt(0)))

      const { data, error } = await userService.getUserByNfcChipId(searchValue)

      console.log('📦 Supabase response - data:', data)
      console.log('📦 Supabase response - error:', error)

      if (error || !data) {
        console.error('❌ User not found or error:', error)
        setErrorMessage('User not found. Please register first.')
        setIsLookingUp(false)
        return
      }

      // Store user data and embedding
      setUserData(data)
      setStoredEmbedding(data.face_embedding)

      console.log('✅ User found:', data.name)

      // Move to face scan step
      setCurrentStep(1)
    } catch (error) {
      console.error('❌ Lookup error:', error)
      setErrorMessage('Failed to lookup user. Please try again.')
    } finally {
      setIsLookingUp(false)
    }
  }

  // Handle NFC input keydown (for USB readers that send Enter)
  const handleNfcKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNfcLookup()
    }
  }

  // Continuous face scanning for login
  const scanFace = useCallback(async () => {
    if (!webcamRef.current || !isScanning || !storedEmbedding) return

    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    // Use verifyLogin with stored embedding
    const result = await faceAuthService.verifyLogin(imageSrc, storedEmbedding)

    if (result.score !== undefined && result.score !== null) {
      setScanScore(result.score)
    }

    if (result.success) {
      // Face verified!
      setIsScanning(false)
      setScanResult('success')

      // Login the user
      login(userData.user_id)

      // Move to verified step after brief delay
      setTimeout(() => {
        setCurrentStep(2)
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      }, 500)
    } else if (result.status === 'fail') {
      setScanResult('mismatch')
    } else if (result.noFace) {
      setScanResult('no_face')
      setScanScore(null)
    } else {
      setScanResult('scanning')
    }
  }, [isScanning, storedEmbedding, userData, login, navigate])

  // Start scanning interval
  useEffect(() => {
    let interval
    if (isScanning && currentStep === 1) {
      interval = setInterval(scanFace, 1000)
    }
    return () => clearInterval(interval)
  }, [isScanning, currentStep, scanFace])

  // Start scanning when entering face scan step
  useEffect(() => {
    if (currentStep === 1) {
      setIsScanning(true)
      setScanResult('scanning')
      setScanScore(null)
    } else {
      setIsScanning(false)
    }
  }, [currentStep])

  // Demo quick login (bypasses face recognition)
  const handleDemoLogin = (user) => {
    login(user.id)
    setCurrentStep(2)
    setTimeout(() => {
      navigate('/dashboard')
    }, 1500)
  }

  return (
    <div className="min-h-screen gradient-background flex flex-col">
      {/* Header/Logo Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-10 pb-6 px-4"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src="/images/myjanji_logov2.png"
            alt="MyJanji Logo"
            className="h-12 w-auto object-contain"
          />
          <h1 className="text-3xl font-bold text-header">MyJanji</h1>
        </div>
        <p className="text-body/60 text-sm">Digital Contract Management Platform</p>

        {/* Backend Status */}
        <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-xs font-medium ${backendOnline === null ? 'bg-gray-100 text-gray-500' :
          backendOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
          {backendOnline === null ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Checking server...</>
          ) : backendOnline ? (
            <><Wifi className="h-3 w-3" /> Face Recognition Ready</>
          ) : (
            <><WifiOff className="h-3 w-3" /> Server Offline</>
          )}
        </div>
      </motion.div>

      {/* Main Card */}
      <div className="flex-1 px-4 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="max-w-md mx-auto" padding="lg">
            {/* Back Button */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-body/60 hover:text-header mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Home</span>
            </button>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-secondary to-secondary-light bg-clip-text text-transparent">
              Sign In to MyJanji
            </h2>

            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-12 h-12 rounded-2xl flex items-center justify-center
                        transition-all duration-300
                        ${currentStep > step.id
                          ? 'icon-container-primary text-white shadow-lg'
                          : currentStep === step.id
                            ? 'icon-container-primary text-white shadow-lg scale-110'
                            : 'icon-container text-body/40'
                        }
                      `}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
                      ) : (
                        <step.icon className="h-5 w-5" strokeWidth={1.5} />
                      )}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${currentStep >= step.id ? 'text-header' : 'text-body/40'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-1 mx-2 mt-[-18px] rounded-full transition-colors duration-300 ${currentStep > step.id ? 'bg-gradient-to-r from-primary-mid to-accent' : 'bg-gray-200'
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {/* Step 0: Tap NFC */}
              {currentStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 mx-auto mb-4 icon-container rounded-3xl flex items-center justify-center">
                    <Smartphone className="h-10 w-10 text-primary-mid" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-header mb-2">Tap Your ID Card</h3>
                  <p className="text-body/60 text-sm mb-6">
                    Place your registered MyKad on the NFC reader to identify yourself
                  </p>

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  {/* NFC Input */}
                  <div className="mb-6">
                    <input
                      ref={nfcInputRef}
                      type="password"
                      value={nfcChipId}
                      onChange={(e) => setNfcChipId(e.target.value)}
                      onKeyDown={handleNfcKeyDown}
                      onBlur={() => nfcInputRef.current?.focus()}
                      placeholder="Waiting for NFC card..."
                      className="w-full p-4 text-center text-lg border-2 border-primary/30 rounded-xl focus:border-primary focus:outline-none"
                      autoFocus
                    />
                    {nfcChipId && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Card detected! Click "Find My Account" to continue.
                      </p>
                    )}
                  </div>

                  {/* Lookup Button */}
                  <Button
                    fullWidth
                    onClick={handleNfcLookup}
                    disabled={isLookingUp || !nfcChipId.trim()}
                    loading={isLookingUp}
                  >
                    {isLookingUp ? 'Looking up...' : 'Find My Account'}
                  </Button>

                  {/* Demo Quick Access */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-xs text-body/40 mb-4">Quick Demo Access (Skip NFC & Face)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {availableUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleDemoLogin(user)}
                          className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-primary/5 border border-gray-200 hover:border-primary/30 transition-all text-left"
                        >
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-header truncate">
                              {user.name.split(' ')[0]}
                            </p>
                            <p className="text-xs text-body/50">Demo</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Face Scan */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <h3 className="text-xl font-bold text-header mb-2">Verify Your Face</h3>
                  <p className="text-body/60 text-sm mb-4">
                    Welcome back, {userData?.name || 'User'}! Look at the camera to verify.
                  </p>

                  {/* Webcam */}
                  <div className="relative rounded-xl overflow-hidden mb-4 bg-gray-900">
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full aspect-[4/3] object-cover"
                      videoConstraints={{
                        facingMode: 'user',
                        width: 640,
                        height: 480,
                      }}
                    />

                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-48 h-48 border-4 rounded-full ${scanResult === 'success' ? 'border-green-500' :
                        scanResult === 'mismatch' ? 'border-red-500' :
                          'border-white/50 animate-pulse'
                        }`} />
                    </div>

                    {/* Score Display */}
                    {scanScore !== null && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                        Score: {scanScore}%
                      </div>
                    )}
                  </div>

                  {/* Status Message */}
                  <p className={`text-sm font-medium ${scanResult === 'success' ? 'text-green-600' :
                    scanResult === 'mismatch' ? 'text-red-600' :
                      scanResult === 'no_face' ? 'text-yellow-600' :
                        'text-body/60'
                    }`}>
                    {scanResult === 'success' ? '✓ Identity Verified!' :
                      scanResult === 'mismatch' ? '✗ Face mismatch - keep trying...' :
                        scanResult === 'no_face' ? 'Position your face in the circle' :
                          'Scanning...'}
                  </p>
                </motion.div>
              )}

              {/* Step 2: Verified */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    <CheckCircle className="h-20 w-20 text-status-ongoing mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-header mb-2">Welcome Back!</h3>
                  <p className="text-body/60">
                    {userData?.name || 'User'}, you are now logged in.
                  </p>
                  <p className="text-sm text-body/40 mt-4">Redirecting to dashboard...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
