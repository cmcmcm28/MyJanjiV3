import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Webcam from 'react-webcam'
import {
  CreditCard,
  User,
  ScanFace,
  CheckCircle,
  Upload,
  ChevronRight,
  Camera,
  ImageIcon,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import faceAuthService from '../services/faceAuthService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const steps = [
  { id: 0, label: 'Upload IC', icon: CreditCard },
  { id: 1, label: 'Face Scan', icon: ScanFace },
  { id: 2, label: 'Verified', icon: CheckCircle },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, availableUsers } = useAuth()
  const webcamRef = useRef(null)
  const fileInputRef = useRef(null)

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedUser, setSelectedUser] = useState(null)
  const [icPreview, setIcPreview] = useState(null)
  const [icFile, setIcFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
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

  // Handle IC file selection
  const handleICSelect = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      setIcFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setIcPreview(e.target.result)
      }
      reader.readAsDataURL(file)
      setErrorMessage(null)
    }
  }

  // Upload IC to backend
  const handleICUpload = async () => {
    if (!icFile && !icPreview) return

    setIsUploading(true)
    setErrorMessage(null)

    try {
      const result = await faceAuthService.uploadIC(icFile || icPreview)

      if (result.success) {
        setCurrentStep(1) // Move to face scan step
      } else {
        setErrorMessage(result.message)
      }
    } catch (error) {
      setErrorMessage('Failed to upload IC. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Continuous face scanning
  const scanFace = useCallback(async () => {
    if (!webcamRef.current || !isScanning) return

    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    const result = await faceAuthService.verifyFrame(imageSrc)

    if (result.success) {
      // Face verified!
      setIsScanning(false)
      setScanResult('success')
      setScanScore(result.score)

      // Select first available user for demo (in production, this would be determined by the face match)
      const matchedUser = availableUsers[0]
      setSelectedUser(matchedUser)
      login(matchedUser.id)

      // Move to verified step after brief delay
      setTimeout(() => {
        setCurrentStep(2)
        // Navigate to dashboard after showing success
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      }, 500)
    } else if (result.status === 'fail') {
      // Face detected but doesn't match
      setScanResult('mismatch')
      setScanScore(result.score)
    } else if (result.noFace) {
      // No face detected, keep scanning
      setScanResult('no_face')
    } else {
      // Error
      setScanResult('error')
    }
  }, [isScanning, availableUsers, login, navigate])

  // Start scanning interval
  useEffect(() => {
    let interval
    if (isScanning && currentStep === 1) {
      interval = setInterval(scanFace, 1000) // Scan every second
    }
    return () => clearInterval(interval)
  }, [isScanning, currentStep, scanFace])

  // Start scanning when entering face scan step
  useEffect(() => {
    if (currentStep === 1) {
      setIsScanning(true)
      setScanResult(null)
      setScanScore(null)
    } else {
      setIsScanning(false)
    }
  }, [currentStep])

  // Demo quick login (bypasses face recognition)
  const handleDemoLogin = (user) => {
    setSelectedUser(user)
    setIcPreview(user.avatar)
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
                        w-10 h-10 rounded-full flex items-center justify-center
                        transition-all duration-300
                        ${currentStep > step.id
                          ? 'bg-status-ongoing text-white'
                          : currentStep === step.id
                            ? 'gradient-primary text-white'
                            : 'bg-gray-200 text-body/40'
                        }
                      `}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-1.5 font-medium ${currentStep >= step.id ? 'text-header' : 'text-body/40'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-1 mt-[-18px] transition-colors duration-300 ${currentStep > step.id ? 'bg-status-ongoing' : 'bg-gray-200'
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {/* Step 0: Upload IC */}
              {currentStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <CreditCard className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-header mb-2">Upload Your IC Photo</h3>
                  <p className="text-body/60 text-sm mb-6">
                    Take a photo of your MyKad or select from gallery for identity verification
                  </p>

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  {/* IC Preview or Upload Zone */}
                  {icPreview ? (
                    <div className="mb-6">
                      <div className="rounded-xl overflow-hidden border-2 border-primary/20 mb-3">
                        <img src={icPreview} alt="IC Preview" className="w-full h-48 object-contain bg-gray-50" />
                      </div>
                      <button
                        onClick={() => {
                          setIcPreview(null)
                          setIcFile(null)
                        }}
                        className="text-sm text-body/50 hover:text-primary"
                      >
                        Choose different photo
                      </button>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleICSelect}
                        className="hidden"
                      />
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                          onClick={() => {
                            fileInputRef.current.setAttribute('capture', 'environment')
                            fileInputRef.current.click()
                          }}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors bg-gray-50"
                        >
                          <Camera className="h-8 w-8 text-primary" />
                          <span className="text-sm font-medium text-header">Take Photo</span>
                        </button>
                        <button
                          onClick={() => {
                            fileInputRef.current.removeAttribute('capture')
                            fileInputRef.current.click()
                          }}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors bg-gray-50"
                        >
                          <ImageIcon className="h-8 w-8 text-secondary" />
                          <span className="text-sm font-medium text-header">Gallery</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  {icPreview && (
                    <Button
                      fullWidth
                      onClick={handleICUpload}
                      disabled={isUploading || !backendOnline}
                      loading={isUploading}
                      icon={isUploading ? Loader2 : Upload}
                    >
                      {isUploading ? 'Uploading...' : 'Continue with Face Scan'}
                    </Button>
                  )}

                  {/* Backend Offline Warning */}
                  {backendOnline === false && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                      <p className="font-medium">Face Recognition Server Offline</p>
                      <p className="text-xs mt-1">Start the Python backend or use Demo Login below</p>
                    </div>
                  )}

                  {/* Demo Quick Access */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-xs text-body/40 mb-4">Quick Demo Access (Skip Face Recognition)</p>
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
                >
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-header mb-2">Face Verification</h3>
                    <p className="text-body/60 text-sm">
                      Position your face in the frame. Scanning automatically...
                    </p>
                  </div>

                  {/* Webcam */}
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
                    />

                    {/* Face Guide Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-48 h-60 border-4 rounded-full transition-colors duration-300 ${scanResult === 'success' ? 'border-green-500' :
                        scanResult === 'mismatch' ? 'border-red-500' :
                          scanResult === 'no_face' ? 'border-yellow-500' :
                            'border-white/50'
                        }`} />
                    </div>

                    {/* Scanning Animation */}
                    {isScanning && (
                      <motion.div
                        initial={{ y: '-100%' }}
                        animate={{ y: '100%' }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-x-0 h-1 bg-gradient-to-b from-transparent via-primary to-transparent"
                      />
                    )}
                  </div>

                  {/* Scan Status */}
                  <div className={`text-center p-3 rounded-xl mb-4 ${scanResult === 'success' ? 'bg-green-50 text-green-700' :
                    scanResult === 'mismatch' ? 'bg-red-50 text-red-700' :
                      scanResult === 'no_face' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-blue-50 text-blue-700'
                    }`}>
                    {scanResult === 'success' ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Identity Verified! Score: {scanScore}%</span>
                      </div>
                    ) : scanResult === 'mismatch' ? (
                      <div className="flex items-center justify-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        <span>Face doesn't match IC. Score: {scanScore}%</span>
                      </div>
                    ) : scanResult === 'no_face' ? (
                      <div className="flex items-center justify-center gap-2">
                        <ScanFace className="h-5 w-5" />
                        <span>No face detected. Please face the camera.</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Scanning your face...</span>
                      </div>
                    )}
                  </div>

                  {/* Back Button */}
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => {
                      setCurrentStep(0)
                      setIsScanning(false)
                    }}
                  >
                    Back to IC Upload
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Verified */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                  >
                    <CheckCircle className="h-20 w-20 text-status-ongoing mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-status-ongoing mb-2">Identity Verified!</h3>
                  {scanScore && (
                    <p className="text-lg text-body/60 mb-4">Match Score: {scanScore}%</p>
                  )}

                  {selectedUser && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                      <img
                        src={selectedUser.avatar}
                        alt={selectedUser.name}
                        className="w-16 h-16 rounded-xl object-cover mx-auto mb-3"
                      />
                      <p className="font-semibold text-header">{selectedUser.name}</p>
                      <p className="text-sm text-body/60">IC: {selectedUser.ic}</p>
                    </div>
                  )}

                  <p className="text-body/60">Redirecting to dashboard...</p>
                  <div className="flex justify-center mt-4">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-body/40">
        <p>© 2025 MyJanji. Secure Digital Contracts.</p>
      </div>
    </div>
  )
}
