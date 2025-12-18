import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Check,
  X,
  Calendar,
  User,
  ScanFace,
  AlertCircle,
  Loader2,
  Nfc,
  Eye,
  Square,
  CheckSquare,
  XCircle,
  MessageSquare,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useContracts } from '../context/ContractContext'
import { users } from '../utils/dummyData'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Input, { Textarea } from '../components/ui/Input'
import SignaturePad from '../components/features/SignaturePad'
import LiveFaceVerification from '../components/features/LiveFaceVerification'
import NFCScanner from '../components/features/NFCScanner'
import PDFPreviewModal from '../components/features/PDFPreviewModal'

const steps = [
  { id: 0, label: 'Review & Consent', icon: FileText },
  { id: 1, label: 'NFC Scan', icon: Nfc },
  { id: 2, label: 'Face Verify', icon: ScanFace },
  { id: 3, label: 'Sign', icon: Check },
]

export default function SignContractPage() {
  const { contractId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { getContractById, signContract, declineContract } = useContracts()

  const [contract, setContract] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasConsented, setHasConsented] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [nfcData, setNfcData] = useState(null)
  const [isFaceVerified, setIsFaceVerified] = useState(false)
  const [signature, setSignature] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (contractId) {
      const found = getContractById(contractId)
      setContract(found)
    }
  }, [contractId, getContractById])

  const handleNFCSuccess = (data) => {
    setNfcData(data)
    // Auto-advance to face verification after brief delay
    setTimeout(() => {
      setCurrentStep(2)
    }, 1500)
  }

  const handleNFCSkip = () => {
    // For demo: skip NFC and go to face verification
    setNfcData({ skipped: true, timestamp: new Date().toISOString() })
    setCurrentStep(2)
  }

  const handleFaceVerified = (result) => {
    setIsFaceVerified(true)
    // Auto-advance to signature step after brief delay
    setTimeout(() => {
      setCurrentStep(3)
    }, 1500)
  }

  const handleFaceError = (error) => {
    console.error('Face verification error:', error)
  }

  const handleSignatureSave = (signatureData) => {
    setSignature(signatureData)
  }

  const handleSubmitSignature = async () => {
    if (!signature || !contract) return

    setIsSubmitting(true)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update contract with signature
    signContract(contract.id, signature, true)

    // Navigate back to dashboard
    navigate('/dashboard')
  }

  const handleReject = () => {
    setShowDeclineModal(true)
  }

  const handleConfirmDecline = () => {
    if (!contract) return
    
    declineContract(contract.id, currentUser.id, declineReason || null)
    
    // Show success and navigate
    setTimeout(() => {
      navigate('/dashboard')
    }, 1500)
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Sign Contract" showBack />
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="text-center max-w-sm mx-4" padding="lg">
            <AlertCircle className="h-12 w-12 text-status-breached mx-auto mb-4" />
            <h2 className="text-lg font-bold text-header mb-2">Contract Not Found</h2>
            <p className="text-body/60 mb-4">
              The contract you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  const creator = users[contract.userId]

  return (
    <div className="min-h-screen bg-background">
      <Header title="Sign Contract" showBack />

      <div className="px-4 py-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                    ${currentStep > step.id
                      ? 'bg-status-ongoing text-white'
                      : currentStep === step.id
                      ? 'gradient-primary text-white'
                      : 'bg-gray-200 text-body/40'
                    }
                  `}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className={`text-xs mt-1 whitespace-nowrap ${currentStep >= step.id ? 'text-header' : 'text-body/40'}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 mt-[-18px] flex-shrink-0 ${
                    currentStep > step.id ? 'bg-status-ongoing' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 0: Review Contract, Preview PDF & Consent */}
          {currentStep === 0 && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-mono text-body/50">{contract.id}</span>
                  <span className="text-xs bg-status-pending/10 text-status-pending px-2 py-1 rounded-full font-medium">
                    Awaiting Your Signature
                  </span>
                </div>

                <h2 className="text-xl font-bold text-header mb-2">{contract.name}</h2>
                <p className="text-body/60 mb-6">{contract.topic}</p>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-body/50 mb-2">From (Creator)</p>
                    <div className="flex items-center gap-3">
                      <img
                        src={creator?.avatar}
                        alt={creator?.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium text-header text-sm">{creator?.name}</p>
                        <p className="text-xs text-body/50">{creator?.ic}</p>
                      </div>
                    </div>
                    {contract.creatorSignature && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-body/50 mb-1">Signed</p>
                        <img
                          src={contract.creatorSignature}
                          alt="Creator signature"
                          className="h-12 object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-primary/5 rounded-xl p-4 border-2 border-primary/20">
                    <p className="text-xs text-primary mb-2">To (You)</p>
                    <div className="flex items-center gap-3">
                      <img
                        src={currentUser?.avatar}
                        alt={currentUser?.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium text-header text-sm">{currentUser?.name}</p>
                        <p className="text-xs text-body/50">{currentUser?.ic}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview PDF Button */}
                <div className="mb-6">
                  <Button
                    onClick={() => setShowPdfPreview(true)}
                    variant="outline"
                    icon={Eye}
                    className="w-full"
                  >
                    Preview Contract PDF (Signed by {creator?.name})
                  </Button>
                </div>

                {/* Consent Checkbox */}
                <div className="mb-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setHasConsented(!hasConsented)}
                    className="flex items-start gap-3 w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {hasConsented ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-body/40" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${hasConsented ? 'text-header' : 'text-body/70'}`}>
                        I have reviewed and agree to the contract
                      </p>
                      <p className="text-xs text-body/50 mt-1">
                        I confirm that I have read and understand all terms and conditions in this contract.
                        I agree to proceed with identity verification and signing.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Next Steps Info */}
                <div className={`rounded-xl p-4 mb-6 transition-colors ${hasConsented ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <p className={`text-sm font-medium mb-2 ${hasConsented ? 'text-blue-800' : 'text-body/50'}`}>Next Steps:</p>
                  <div className={`space-y-2 text-sm ${hasConsented ? 'text-blue-700' : 'text-body/40'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${hasConsented ? 'bg-blue-200' : 'bg-gray-200'}`}>1</div>
                      <span>NFC Scan - Verify your MyKad chip</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${hasConsented ? 'bg-blue-200' : 'bg-gray-200'}`}>2</div>
                      <span>Face ID - Live face verification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${hasConsented ? 'bg-blue-200' : 'bg-gray-200'}`}>3</div>
                      <span>Digital Signature - Sign the contract</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    icon={X}
                    onClick={handleReject}
                  >
                    Decline
                  </Button>
                  <Button
                    className="flex-1"
                    icon={Check}
                    onClick={() => setCurrentStep(1)}
                    disabled={!hasConsented}
                  >
                    {hasConsented ? 'Continue' : 'Please consent above'}
                  </Button>
                </div>
              </Card>

              <p className="text-xs text-body/40 text-center mt-4 px-4">
                By accepting, you agree to verify your identity and sign this contract.
              </p>
            </motion.div>
          )}

          {/* Step 1: NFC Scan */}
          {currentStep === 1 && (
            <motion.div
              key="nfc"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card padding="lg">
                <NFCScanner
                  onSuccess={handleNFCSuccess}
                  onSkip={handleNFCSkip}
                  title="Verify Your Identity"
                  description="Scan your MyKad NFC chip to verify your identity before face verification"
                />
              </Card>
            </motion.div>
          )}

          {/* Step 2: Live Face Verification */}
          {currentStep === 2 && (
            <motion.div
              key="face"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card padding="lg">
                <div className="text-center mb-6">
                  <ScanFace className="h-12 w-12 text-primary mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-header mb-2">Live Face Verification</h2>
                  <p className="text-body/60 text-sm">
                    Position your face in the frame. Verification runs automatically.
                  </p>
                </div>

                {/* NFC Data Preview */}
                {nfcData && !nfcData.skipped && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                    <div className="flex items-center gap-2 text-green-700 text-sm">
                      <Check className="h-4 w-4" />
                      <span>MyKad Verified: {nfcData.icNumber}</span>
                    </div>
                  </div>
                )}

                <LiveFaceVerification
                  onVerified={handleFaceVerified}
                  onError={handleFaceError}
                  interval={1000}
                />

                {isFaceVerified && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center"
                  >
                    <p className="text-status-ongoing font-medium">
                      Face verified! Proceeding to signature...
                    </p>
                  </motion.div>
                )}

                {/* Skip button for demo */}
                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                  <button
                    onClick={() => {
                      setIsFaceVerified(true)
                      setCurrentStep(3)
                    }}
                    className="text-sm text-body/50 hover:text-primary transition-colors"
                  >
                    Skip verification (Demo)
                  </button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Signature */}
          {currentStep === 3 && (
            <motion.div
              key="sign"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card padding="lg">
                <div className="text-center mb-6">
                  <Check className="h-12 w-12 text-status-ongoing mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-header mb-2">Add Your Signature</h2>
                  <p className="text-body/60 text-sm">
                    Sign below to finalize the contract
                  </p>
                </div>

                {/* Verification Status */}
                <div className="flex gap-3 mb-6">
                  <div className={`flex-1 p-3 rounded-xl ${nfcData ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      {nfcData ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Nfc className="h-4 w-4 text-body/40" />
                      )}
                      <span className={`text-sm font-medium ${nfcData ? 'text-green-700' : 'text-body/40'}`}>
                        NFC {nfcData ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className={`flex-1 p-3 rounded-xl ${isFaceVerified ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      {isFaceVerified ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <ScanFace className="h-4 w-4 text-body/40" />
                      )}
                      <span className={`text-sm font-medium ${isFaceVerified ? 'text-green-700' : 'text-body/40'}`}>
                        Face {isFaceVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {signature ? (
                  <div className="text-center">
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <img
                        src={signature}
                        alt="Your signature"
                        className="max-h-24 mx-auto"
                      />
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSignature(null)}
                      >
                        Redo Signature
                      </Button>
                    </div>
                  </div>
                ) : (
                  <SignaturePad
                    onSave={handleSignatureSave}
                    width={350}
                    height={180}
                  />
                )}

                {signature && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <Button
                      fullWidth
                      onClick={handleSubmitSignature}
                      disabled={isSubmitting}
                      icon={isSubmitting ? Loader2 : Check}
                      loading={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Signed Contract'}
                    </Button>
                  </motion.div>
                )}
              </Card>

              <p className="text-xs text-body/40 text-center mt-4 px-4">
                By signing, you legally agree to all terms and conditions in this contract.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        contract={contract}
        creator={creator}
        acceptee={currentUser}
        templateType={contract.templateType}
        formData={contract.formData}
        title={`Contract: ${contract.name}`}
        allowDownload={true}
      />

      {/* Decline Contract Modal */}
      <Modal
        isOpen={showDeclineModal}
        onClose={() => {
          setShowDeclineModal(false)
          setDeclineReason('')
        }}
        title="Decline Contract"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <XCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Are you sure?</p>
              <p className="text-sm text-red-600">
                This will decline the contract. {creator?.name || 'The creator'} will be notified.
              </p>
            </div>
          </div>

          <div>
            <Textarea
              label="Reason for declining (optional)"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g., Terms not suitable, Amount too high, etc."
              rows={4}
              icon={MessageSquare}
            />
            <p className="text-xs text-body/50 mt-2">
              Providing a reason helps the other party understand your decision.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineModal(false)
                setDeclineReason('')
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDecline}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Decline Contract
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
