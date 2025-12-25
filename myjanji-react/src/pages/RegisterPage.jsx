import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Webcam from 'react-webcam'
import {
  CreditCard,
  ScanFace,
  CheckCircle,
  Upload,
  Camera,
  ImageIcon,
  Loader2,
  AlertCircle,
  ArrowLeft,
  UserPlus,
  Wifi,
  WifiOff,
  Smartphone,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import faceAuthService from '../services/faceAuthService'
import { userService } from '../services/supabase/userService'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'

const steps = [
  { id: 0, label: 'Upload IC', icon: CreditCard },
  { id: 1, label: 'Face Scan', icon: ScanFace },
  { id: 2, label: 'Details', icon: UserPlus },
  { id: 3, label: 'Tap NFC', icon: Smartphone },
  { id: 4, label: 'Complete', icon: CheckCircle },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const webcamRef = useRef(null)
  const fileInputRef = useRef(null)

  const [currentStep, setCurrentStep] = useState(0)
  const [icPreview, setIcPreview] = useState(null)
  const [icFile, setIcFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanScore, setScanScore] = useState(null)
  const [backendOnline, setBackendOnline] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [ocrExtracted, setOcrExtracted] = useState(null) // Store OCR results for display

  // NFC state
  const [nfcChipId, setNfcChipId] = useState('')
  const [isNfcScanning, setIsNfcScanning] = useState(false)
  const [nfcSupported, setNfcSupported] = useState(false)

  // Additional registration data
  const [dob, setDob] = useState('') // Date of birth from OCR
  const [faceEmbedding, setFaceEmbedding] = useState(null) // Face embedding from IC upload

  // Registration form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    icNumber: '',
  })

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

  // Upload IC to backend and extract details
  const handleICUpload = async () => {
    if (!icFile && !icPreview) return

    setIsUploading(true)
    setErrorMessage(null)

    try {
      // First extract IC details using OCR
      console.log('🔍 Starting OCR extraction...')
      const ocrResult = await faceAuthService.extractICDetails(icFile || icPreview)
      console.log('📋 OCR Result:', ocrResult)

      if (ocrResult.success && ocrResult.data) {
        const extracted = ocrResult.data

        // Check if there's an error in the data
        if (extracted.error) {
          console.warn('⚠️ OCR extraction error:', extracted.error)
        } else {
          // Auto-fill form with extracted data
          console.log('✅ OCR extracted data:', extracted)
          setFormData(prev => {
            const updated = {
              ...prev,
              name: extracted.name || prev.name,
              icNumber: extracted.icNumber || prev.icNumber,
            }
            console.log('📝 Updated formData:', updated)
            return updated
          })
          // Store DOB from OCR
          if (extracted.dateOfBirth) {
            setDob(extracted.dateOfBirth)
            console.log('📅 DOB extracted:', extracted.dateOfBirth)
          }
        }
      } else {
        console.warn('⚠️ OCR extraction failed or returned no data')
      }

      // Then upload for face recognition
      console.log('📤 Uploading IC for face recognition...')
      const result = await faceAuthService.uploadIC(icFile || icPreview)
      console.log('📥 Upload result:', result)

      if (result.success) {
        // Store face embedding from upload
        if (result.faceEmbedding) {
          setFaceEmbedding(result.faceEmbedding)
          console.log('🧠 Face embedding captured (length:', result.faceEmbedding.length, ')')
        }

        // Also check if OCR data came from upload endpoint (backup)
        if (result.ocrData && !result.ocrData.error) {
          const extracted = result.ocrData
          console.log('✅ OCR data from upload endpoint:', extracted)
          setOcrExtracted(extracted) // Store for display
          setFormData(prev => {
            const updated = {
              ...prev,
              name: extracted.name || prev.name,
              icNumber: extracted.icNumber || prev.icNumber,
            }
            console.log('📝 Updated formData from upload:', updated)
            return updated
          })
          // Also capture DOB from upload OCR (backup)
          if (extracted.dateOfBirth && !dob) {
            setDob(extracted.dateOfBirth)
            console.log('📅 DOB from upload OCR:', extracted.dateOfBirth)
          }
        }
        setCurrentStep(1) // Move to face scan step
      } else {
        setErrorMessage(result.message)
      }
    } catch (error) {
      console.error('❌ Error in handleICUpload:', error)
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

    console.log('Face verification result:', result) // Debug log

    // Always update score if available (even during scanning)
    if (result.score !== undefined && result.score !== null) {
      console.log('Setting score:', result.score) // Debug log
      setScanScore(result.score)
    }

    if (result.success) {
      // Face verified!
      setIsScanning(false)
      setScanResult('success')

      // Move to details step after brief delay
      setTimeout(() => {
        setCurrentStep(2)
      }, 1500)
    } else if (result.status === 'fail') {
      setScanResult('mismatch')
      // Keep scanning if mismatch (don't stop)
    } else if (result.noFace) {
      setScanResult('no_face')
      // Reset score when no face detected
      setScanScore(null)
    } else {
      setScanResult('scanning') // Keep as scanning state instead of error
    }
  }, [isScanning])

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
      setScanResult('scanning') // Set initial state to 'scanning' instead of null
      setScanScore(null)
    } else {
      setIsScanning(false)
    }
  }, [currentStep])

  // Handle proceeding to NFC step (validates form first)
  const handleProceedToNfc = () => {
    if (!formData.name || !formData.email || !formData.icNumber) {
      setErrorMessage('Please fill in all required fields')
      return
    }
    setErrorMessage(null)
    setCurrentStep(3) // Move to NFC tap step
  }

  // Handle final registration with NFC chip ID
  const handleCompleteRegistration = async () => {
    if (!nfcChipId) {
      setErrorMessage('Please tap your ID card or enter the NFC chip ID')
      return
    }

    setIsUploading(true)
    setErrorMessage(null)

    try {
      // Map form data to Supabase user table columns:
      // - name -> name
      // - email -> email
      // - phone -> phone
      // - icNumber -> user_id
      // - nfcChipId -> nfc_chip_id
      // - dob -> dob
      // - faceEmbedding -> face_embedding
      const { data, error } = await userService.createProfile(formData.icNumber, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        nfc_chip_id: nfcChipId,
        dob: dob || null,
        face_embedding: faceEmbedding || null,
      })

      if (error) {
        console.error('Registration error:', error)
        setErrorMessage(error.message || 'Failed to register. Please try again.')
        setIsUploading(false)
        return
      }

      console.log('✅ User registered successfully:', data)
      setCurrentStep(4) // Move to Complete step

      // Navigate to login after showing success
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      console.error('Registration error:', error)
      setErrorMessage('Failed to register. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Start NFC scanning
  const startNfcScan = async () => {
    if ('NDEFReader' in window) {
      setIsNfcScanning(true)
      setErrorMessage(null)
      try {
        const ndef = new window.NDEFReader()
        await ndef.scan()
        ndef.addEventListener('reading', ({ serialNumber }) => {
          console.log('📱 NFC Card detected:', serialNumber)
          setNfcChipId(serialNumber)
          setIsNfcScanning(false)
        })
        ndef.addEventListener('readingerror', () => {
          setErrorMessage('Failed to read NFC card. Please try again.')
          setIsNfcScanning(false)
        })
      } catch (error) {
        console.error('NFC scan error:', error)
        setErrorMessage('NFC scanning failed. Please enter the chip ID manually.')
        setIsNfcScanning(false)
      }
    } else {
      setErrorMessage('NFC is not supported on this device. Please enter the chip ID manually.')
    }
  }

  // Check NFC support on mount
  useEffect(() => {
    setNfcSupported('NDEFReader' in window)
  }, [])

  return (
    <div className="min-h-screen gradient-background flex flex-col">
      {/* Header */}
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
        <p className="text-body/60 text-sm">Create Your Account</p>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md"
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
              Register New Account
            </h2>

            <div className="flex items-start justify-between mb-8 w-full px-1">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center relative z-10 group">
                    <div
                      className={`
                        w-11 h-11 rounded-2xl flex items-center justify-center
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
                    <span className={`text-[10px] sm:text-xs mt-2 font-medium text-center max-w-[4rem] leading-tight transition-colors duration-300 ${currentStep >= step.id ? 'text-header' : 'text-body/40'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-1 mt-5 rounded-full transition-all duration-500 ease-in-out ${currentStep > index ? 'bg-gradient-to-r from-primary-mid to-accent' : 'bg-gray-100'
                        }`}
                    />
                  )}
                </React.Fragment>
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
                  <div className="w-20 h-20 mx-auto mb-4 icon-container rounded-3xl flex items-center justify-center">
                    <CreditCard className="h-10 w-10 text-primary-mid" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-header mb-2">Upload Your IC Photo</h3>
                  <p className="text-body/60 text-sm mb-6">
                    Take a photo of your MyKad or select from gallery
                  </p>

                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {errorMessage}
                    </div>
                  )}

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
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-primary/5 border border-gray-200 hover:border-primary/30 transition-all"
                        >
                          <Camera className="h-6 w-6 text-primary" />
                          <span className="text-sm font-medium text-header">Take Photo</span>
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-primary/5 border border-gray-200 hover:border-primary/30 transition-all"
                        >
                          <ImageIcon className="h-6 w-6 text-primary" />
                          <span className="text-sm font-medium text-header">From Gallery</span>
                        </button>
                      </div>
                    </div>
                  )}

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

                  {backendOnline === false && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                      <p className="font-medium">Face Recognition Server Offline</p>
                      <p className="text-xs mt-1">Please start the Python backend server</p>
                    </div>
                  )}
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

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-48 h-60 border-4 rounded-full transition-colors duration-300 ${scanResult === 'success' ? 'border-green-500' :
                        scanResult === 'mismatch' ? 'border-red-500' :
                          scanResult === 'no_face' ? 'border-yellow-500' :
                            'border-white/50'
                        }`} />
                    </div>

                    {isScanning && (
                      <motion.div
                        initial={{ y: '-100%' }}
                        animate={{ y: '100%' }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-x-0 h-1 bg-gradient-to-b from-transparent via-primary to-transparent"
                      />
                    )}
                  </div>

                  <div className={`text-center p-3 rounded-xl mb-4 ${scanResult === 'success' ? 'bg-green-50 text-green-700' :
                    scanResult === 'mismatch' ? 'bg-red-50 text-red-700' :
                      scanResult === 'no_face' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-blue-50 text-blue-700'
                    }`}>
                    {scanResult === 'success' ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Face Verified! Score: {scanScore}%</span>
                      </div>
                    ) : scanResult === 'mismatch' ? (
                      <div className="flex items-center justify-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        <span>Face mismatch. Score: {scanScore !== null && scanScore !== undefined ? `${scanScore}%` : 'N/A'} (Required: 45%)</span>
                      </div>
                    ) : scanResult === 'no_face' ? (
                      <div className="flex items-center justify-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        <span>No face detected. Please face the camera.</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>
                          {scanScore !== null && scanScore !== undefined
                            ? `Scanning... Score: ${scanScore}%`
                            : 'Scanning your face...'}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Details */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-center mb-6">
                    <UserPlus className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-header mb-2">Complete Your Profile</h3>
                    <p className="text-body/60 text-sm">
                      Please fill in your details to complete registration
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  {/* Show OCR extracted data if available */}
                  {ocrExtracted && !ocrExtracted.error && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Auto-filled from IC:</span>
                      </div>
                      <div className="text-xs text-blue-600 space-y-1">
                        {ocrExtracted.name && <div>✓ Name extracted</div>}
                        {ocrExtracted.icNumber && <div>✓ IC Number extracted</div>}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <Input
                      label="Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      required
                    />
                    <Input
                      label="Phone Number"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                    />
                    <Input
                      label="IC Number"
                      value={formData.icNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, icNumber: e.target.value }))}
                      placeholder="Enter your IC number"
                      required
                    />
                  </div>

                  <Button
                    fullWidth
                    className="mt-6"
                    onClick={handleProceedToNfc}
                    icon={Smartphone}
                  >
                    Tap ID Card
                  </Button>
                </motion.div>
              )}

              {/* Step 3: NFC Tap */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-center mb-6">
                    <Smartphone className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-header mb-2">Tap Your ID Card</h3>
                    <p className="text-body/60 text-sm">
                      {nfcSupported
                        ? 'Hold your MyKad near your device to scan the NFC chip'
                        : 'Enter your NFC chip ID manually below'}
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  {/* NFC Chip ID Input - Hidden input with status indicator overlay */}
                  <div className="mb-6 relative">
                    {/* Hidden input that captures NFC reader keyboard input */}
                    <input
                      ref={(input) => {
                        // Auto-focus when mounting or updating
                        if (input && currentStep === 3) {
                          input.focus()
                        }
                      }}
                      type="password"
                      value={nfcChipId}
                      onChange={(e) => setNfcChipId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (nfcChipId) {
                            handleCompleteRegistration()
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // Keep focus for continuous scanning
                        if (currentStep === 3) {
                          e.target.focus()
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-default"
                      autoFocus
                    />
                    {/* Status indicator overlay */}
                    <div className={`w-full p-4 rounded-xl flex items-center justify-center gap-3 ${nfcChipId ? 'bg-green-50' : 'bg-primary/5'}`}>
                      {nfcChipId ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-700 font-medium">Card detected!</span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="h-5 w-5 text-primary-mid animate-spin" />
                          <span className="text-primary-mid font-medium">Listening for NFC signal...</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    fullWidth
                    onClick={handleCompleteRegistration}
                    disabled={!nfcChipId || isUploading}
                    loading={isUploading}
                    icon={isUploading ? Loader2 : CheckCircle}
                  >
                    {isUploading ? 'Registering...' : 'Complete Registration'}
                  </Button>
                </motion.div>
              )}

              {/* Step 4: Complete */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center"
                >
                  <CheckCircle className="h-16 w-16 text-status-ongoing mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-header mb-2">Registration Complete!</h3>
                  <p className="text-body/60 text-sm mb-6">
                    Your account has been created successfully. Redirecting to login...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>

      {/* Loading Overlay - Shows during IC processing */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm mx-4"
            >
              <div className="relative mx-auto mb-4 w-16 h-16">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <CreditCard className="absolute inset-0 m-auto h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-header mb-2">Processing Your IC</h3>
              <p className="text-body/60 text-sm mb-3">
                Extracting details and verifying...
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-body/40">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>This may take 10-15 seconds</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

