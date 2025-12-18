import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Webcam from 'react-webcam'
import {
  Car,
  Package,
  Receipt,
  Banknote,
  Briefcase,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Nfc,
  ScanFace,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Square,
  CheckSquare,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useContracts } from '../context/ContractContext'
import { users, contractCategories } from '../utils/dummyData'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input, { Textarea, Select } from '../components/ui/Input'
import SignaturePad from '../components/features/SignaturePad'
import NFCScanner from '../components/features/NFCScanner'
import PDFPreviewModal from '../components/features/PDFPreviewModal'
import faceAuthService from '../services/faceAuthService'

const iconMap = {
  Car,
  Package,
  Receipt,
  Banknote,
  Briefcase,
  ShoppingBag,
  FileText,
}

const steps = [
  { id: 0, label: 'Category' },
  { id: 1, label: 'Template' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Review' },
  { id: 4, label: 'NFC Scan', icon: Nfc },
  { id: 5, label: 'Face ID', icon: ScanFace },
  { id: 6, label: 'Sign' },
]

export default function CreateContractPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { addContract } = useContracts()
  const webcamRef = useRef(null)
  
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    topic: '',
    accepteeId: '',
    dueDate: '',
    // Vehicle fields
    model: '',
    plate: '',
    startDate: '',
    endDate: '',
    fuel: 'Full-to-Full',
    // Item fields
    item: '',
    condition: 'Brand New',
    returnDate: '',
    value: '',
    // Bill split fields
    description: '',
    total: '',
    share: '',
    // Loan fields
    amount: '',
    purpose: '',
    date: '',
    // Freelance fields
    task: '',
    deadline: '',
    price: '',
    deposit: '',
  })
  const [creatorSignature, setCreatorSignature] = useState(null)
  
  // NFC and Face verification states
  const [nfcData, setNfcData] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [faceVerified, setFaceVerified] = useState(false)
  
  // PDF preview and consent states
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [hasConsented, setHasConsented] = useState(false)

  const availableAcceptees = Object.values(users).filter(u => u.id !== currentUser?.id)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCategorySelect = (category) => {
    setSelectedCategory(category)
    setCurrentStep(1)
  }

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template)
    setFormData(prev => ({
      ...prev,
      name: template.name,
      topic: template.description,
    }))
    setCurrentStep(2)
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // NFC scan handlers
  const handleNFCSuccess = (data) => {
    setNfcData(data)
    // Auto-advance to face verification after brief delay
    setTimeout(() => {
      setCurrentStep(5)
    }, 1500)
  }

  const handleNFCSkip = () => {
    // For demo: skip NFC and go to face verification
    setNfcData({ skipped: true, timestamp: new Date().toISOString() })
    setCurrentStep(5)
  }

  // Face verification handlers
  const scanFace = useCallback(async () => {
    if (!webcamRef.current || !isScanning) return

    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    const result = await faceAuthService.verifyFrame(imageSrc)
    
    if (result.success) {
      setIsScanning(false)
      setScanResult({ success: true, score: result.score })
      setFaceVerified(true)
      
      // Auto-advance to signature step
      setTimeout(() => {
        setCurrentStep(6)
      }, 1500)
    } else if (result.status === 'fail') {
      setScanResult({ success: false, message: 'Face mismatch', score: result.score })
    } else if (result.noFace) {
      setScanResult({ success: false, message: 'No face detected' })
    }
  }, [isScanning])

  // Start scanning interval for face verification
  useEffect(() => {
    let interval
    if (isScanning && currentStep === 5) {
      interval = setInterval(scanFace, 1000)
    }
    return () => clearInterval(interval)
  }, [isScanning, currentStep, scanFace])

  // Start scanning when entering face verification step
  useEffect(() => {
    if (currentStep === 5) {
      setIsScanning(true)
      setScanResult(null)
    } else {
      setIsScanning(false)
    }
  }, [currentStep])

  const handleFaceSkip = () => {
    setFaceVerified(true)
    setCurrentStep(6)
  }

  const handleSignatureSave = (signature) => {
    setCreatorSignature(signature)
  }

  const handleCreateContract = () => {
    if (!creatorSignature) return

    const newContract = {
      name: formData.name || selectedTemplate?.name || 'Untitled Contract',
      topic: formData.topic || selectedTemplate?.description || '',
      userId: currentUser.id,
      accepteeId: formData.accepteeId,
      status: 'Pending',
      dueDate: formData.dueDate ? new Date(formData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      templateType: selectedTemplate?.id,
      formData: { ...formData },
      creatorSignature,
      accepteeSignature: null,
      signatureDate: new Date(),
      // Store verification data
      nfcVerification: nfcData,
      faceVerified: faceVerified,
    }

    const createdContract = addContract(newContract)
    // Navigate to contract created page with the contract
    navigate('/contract-created', { state: { contract: createdContract } })
  }

  const renderCategoryStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-xl font-bold text-header mb-2">Choose a Category</h2>
      <p className="text-body/60 mb-6">Select the type of agreement you want to create</p>

      <div className="space-y-4">
        {contractCategories.map((category) => {
          const CategoryIcon = iconMap[category.icon] || Package
          return (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCategorySelect(category)}
              className={`
                w-full text-left rounded-2xl overflow-hidden transition-all
                ${selectedCategory?.id === category.id
                  ? 'ring-2 ring-primary'
                  : 'hover:shadow-lg'
                }
              `}
            >
              <div className={`bg-gradient-to-r ${category.color} p-4 text-white`}>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <CategoryIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{category.name}</h3>
                    <p className="text-white/80 text-sm">{category.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
              <div className="bg-white p-3 border-x border-b border-gray-100">
                <div className="flex gap-2">
                  {category.templates.map((t) => {
                    const TIcon = iconMap[t.icon] || FileText
                    return (
                      <span key={t.id} className="inline-flex items-center gap-1 text-xs text-body/60 bg-gray-100 px-2 py-1 rounded-full">
                        <TIcon className="h-3 w-3" />
                        {t.name}
                      </span>
                    )
                  })}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )

  const renderTemplateStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-xl font-bold text-header mb-2">Choose a Template</h2>
      <p className="text-body/60 mb-6">Select the specific contract type</p>

      {selectedCategory && (
        <div className={`bg-gradient-to-r ${selectedCategory.color} rounded-xl p-3 mb-4 text-white`}>
          <div className="flex items-center gap-2">
            {(() => {
              const CatIcon = iconMap[selectedCategory.icon] || Package
              return <CatIcon className="h-5 w-5" />
            })()}
            <span className="font-semibold">{selectedCategory.name}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {selectedCategory?.templates.map((template) => {
          const Icon = iconMap[template.icon] || FileText
          return (
            <motion.button
              key={template.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTemplateSelect(template)}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                ${selectedTemplate?.id === template.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-primary/30 bg-white'
                }
              `}
            >
              <div className={`bg-gradient-to-r ${selectedCategory.color} p-3 rounded-xl`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-header">{template.name}</p>
                <p className="text-sm text-body/60">{template.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-body/30" />
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )

  const renderDetailsStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <h2 className="text-xl font-bold text-header mb-2">Contract Details</h2>
      <p className="text-body/60 mb-6">Fill in the contract information</p>

      {/* Common Fields */}
      <Input
        label="Contract Name"
        value={formData.name}
        onChange={(e) => handleInputChange('name', e.target.value)}
        placeholder="Enter contract name"
        icon={FileText}
      />

      <Select
        label="Select Acceptee (Other Party)"
        value={formData.accepteeId}
        onChange={(e) => handleInputChange('accepteeId', e.target.value)}
        options={availableAcceptees.map(u => ({ value: u.id, label: `${u.name} (${u.ic})` }))}
        placeholder="Choose the other party"
      />

      {/* Template-specific fields */}
      {selectedTemplate?.id === 'VEHICLE_USE' && (
        <>
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="font-semibold text-header mb-3 flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              Vehicle Details
            </h3>
          </div>
          <Input
            label="Vehicle Model"
            value={formData.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
            placeholder="e.g., Toyota Vios 2023"
          />
          <Input
            label="Plate Number"
            value={formData.plate}
            onChange={(e) => handleInputChange('plate', e.target.value)}
            placeholder="e.g., WXY 1234"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
            />
          </div>
          <Select
            label="Fuel Agreement"
            value={formData.fuel}
            onChange={(e) => handleInputChange('fuel', e.target.value)}
            options={[
              { value: 'Full-to-Full', label: 'Full-to-Full' },
              { value: 'Same-to-Same', label: 'Same-to-Same' },
              { value: 'Borrower pays all', label: 'Borrower pays all' },
            ]}
          />
        </>
      )}

      {selectedTemplate?.id === 'ITEM_BORROW' && (
        <>
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="font-semibold text-header mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Item Details
            </h3>
          </div>
          <Input
            label="Item Name"
            value={formData.item}
            onChange={(e) => handleInputChange('item', e.target.value)}
            placeholder="e.g., iPhone 17, Camera, Laptop"
          />
          <Select
            label="Item Condition"
            value={formData.condition}
            onChange={(e) => handleInputChange('condition', e.target.value)}
            options={[
              { value: 'Brand New', label: 'Brand New' },
              { value: 'Like New', label: 'Like New' },
              { value: 'Good', label: 'Good' },
              { value: 'Fair', label: 'Fair' },
            ]}
          />
          <Input
            label="Return Date"
            type="date"
            value={formData.returnDate}
            onChange={(e) => handleInputChange('returnDate', e.target.value)}
            icon={Calendar}
          />
          <Input
            label="Replacement Value (RM)"
            type="number"
            value={formData.value}
            onChange={(e) => handleInputChange('value', e.target.value)}
            placeholder="5000"
            icon={DollarSign}
          />
        </>
      )}

      {selectedTemplate?.id === 'BILL_SPLIT' && (
        <>
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="font-semibold text-header mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Bill Details
            </h3>
          </div>
          <Input
            label="Expense Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="e.g., Dinner at Restaurant X"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Bill (RM)"
              type="number"
              value={formData.total}
              onChange={(e) => handleInputChange('total', e.target.value)}
              placeholder="100"
            />
            <Input
              label="Their Share (RM)"
              type="number"
              value={formData.share}
              onChange={(e) => handleInputChange('share', e.target.value)}
              placeholder="50"
            />
          </div>
          <Input
            label="Settlement Date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            icon={Calendar}
          />
        </>
      )}

      {selectedTemplate?.id === 'FRIENDLY_LOAN' && (
        <>
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="font-semibold text-header mb-3 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              Loan Details
            </h3>
          </div>
          <Input
            label="Loan Amount (RM)"
            type="number"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="1000"
            icon={DollarSign}
          />
          <Input
            label="Purpose of Loan"
            value={formData.purpose}
            onChange={(e) => handleInputChange('purpose', e.target.value)}
            placeholder="e.g., Emergency expenses, Education"
          />
          <Input
            label="Repayment Date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            icon={Calendar}
          />
        </>
      )}

      {selectedTemplate?.id === 'FREELANCE_JOB' && (
        <>
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="font-semibold text-header mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Job Details
            </h3>
          </div>
          <Textarea
            label="Task Description"
            value={formData.task}
            onChange={(e) => handleInputChange('task', e.target.value)}
            placeholder="Describe the work to be done..."
            rows={3}
          />
          <Input
            label="Deadline"
            type="date"
            value={formData.deadline}
            onChange={(e) => handleInputChange('deadline', e.target.value)}
            icon={Clock}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Price (RM)"
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="500"
            />
            <Input
              label="Deposit Received (RM)"
              type="number"
              value={formData.deposit}
              onChange={(e) => handleInputChange('deposit', e.target.value)}
              placeholder="100"
            />
          </div>
        </>
      )}

      {selectedTemplate?.id === 'SALE_DEPOSIT' && (
        <>
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="font-semibold text-header mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Sale Details
            </h3>
          </div>
          <Input
            label="Item for Sale"
            value={formData.item}
            onChange={(e) => handleInputChange('item', e.target.value)}
            placeholder="e.g., Laptop, Phone, Furniture"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Price (RM)"
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="1000"
            />
            <Input
              label="Deposit Received (RM)"
              type="number"
              value={formData.deposit}
              onChange={(e) => handleInputChange('deposit', e.target.value)}
              placeholder="200"
            />
          </div>
          <Input
            label="Balance Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleInputChange('dueDate', e.target.value)}
            icon={Calendar}
          />
        </>
      )}
    </motion.div>
  )

  const renderReviewStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-xl font-bold text-header mb-2">Review Contract</h2>
      <p className="text-body/60 mb-6">Please review before identity verification</p>

      <Card className="space-y-4" padding="md">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-header">{formData.name || selectedTemplate?.name}</h3>
            <p className="text-sm text-body/60">{selectedCategory?.name} → {selectedTemplate?.name}</p>
          </div>
          <span className="text-xs bg-status-pending/10 text-status-pending px-2 py-1 rounded-full">
            Pending
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-body/50 mb-1">Lender/Owner/Seller</p>
            <div className="flex items-center gap-2">
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-8 h-8 rounded-lg object-cover"
              />
              <p className="font-medium text-header text-sm">{currentUser?.name}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-body/50 mb-1">Borrower/Buyer/Provider</p>
            <div className="flex items-center gap-2">
              {formData.accepteeId && users[formData.accepteeId] ? (
                <>
                  <img
                    src={users[formData.accepteeId].avatar}
                    alt={users[formData.accepteeId].name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <p className="font-medium text-header text-sm">
                    {users[formData.accepteeId].name}
                  </p>
                </>
              ) : (
                <p className="text-body/50 text-sm">Not selected</p>
              )}
            </div>
          </div>
        </div>

        {/* Preview Contract Button */}
        <div className="pt-3 border-t border-gray-100">
          <Button
            onClick={() => setShowPdfPreview(true)}
            variant="outline"
            icon={Eye}
            className="w-full"
          >
            Preview Contract (PDF)
          </Button>
        </div>

        {/* Consent Checkbox */}
        <div className="pt-3 border-t border-gray-100">
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
                I have reviewed the contract
              </p>
              <p className="text-xs text-body/50 mt-1">
                I confirm that I have read and understand all terms and conditions in this contract. 
                I agree to proceed with identity verification and signing.
              </p>
            </div>
          </button>
        </div>

        {/* Next steps info */}
        <div className={`rounded-xl p-4 mt-4 transition-colors ${hasConsented ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
          <p className={`text-sm font-medium mb-2 ${hasConsented ? 'text-blue-800' : 'text-body/50'}`}>Next Steps:</p>
          <div className={`space-y-2 text-sm ${hasConsented ? 'text-blue-700' : 'text-body/40'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${hasConsented ? 'bg-blue-200' : 'bg-gray-200'}`}>1</div>
              <span>NFC Scan - Verify your MyKad chip</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${hasConsented ? 'bg-blue-200' : 'bg-gray-200'}`}>2</div>
              <span>Face ID - Verify your identity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${hasConsented ? 'bg-blue-200' : 'bg-gray-200'}`}>3</div>
              <span>Digital Signature - Sign the contract</span>
            </div>
          </div>
        </div>
      </Card>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        templateType={selectedTemplate?.id}
        formData={formData}
        creator={currentUser}
        acceptee={formData.accepteeId ? users[formData.accepteeId] : null}
        title={`Preview: ${formData.name || selectedTemplate?.name}`}
      />
    </motion.div>
  )

  const renderNFCStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card padding="lg">
        <NFCScanner
          onSuccess={handleNFCSuccess}
          onSkip={handleNFCSkip}
          title="Verify Your Identity"
          description="Scan your MyKad NFC chip to verify your identity before signing"
        />
      </Card>
    </motion.div>
  )

  const renderFaceVerificationStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card padding="lg">
        <div className="text-center mb-4">
          <ScanFace className="h-12 w-12 text-primary mx-auto mb-3" />
          <h3 className="text-xl font-bold text-header mb-2">Face Verification</h3>
          <p className="text-body/60 text-sm">
            Look at the camera to verify your identity
          </p>
        </div>

        {/* NFC Data Preview */}
        {nfcData && !nfcData.skipped && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>MyKad Verified: {nfcData.icNumber}</span>
            </div>
          </div>
        )}

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
            <div className={`w-48 h-60 border-4 rounded-full transition-colors duration-300 ${
              scanResult?.success ? 'border-green-500' :
              scanResult?.message === 'Face mismatch' ? 'border-red-500' :
              scanResult?.message === 'No face detected' ? 'border-yellow-500' :
              'border-white/50'
            }`} />
          </div>

          {/* Scanning Animation */}
          {isScanning && !scanResult?.success && (
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: '100%' }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-x-0 h-1 bg-gradient-to-b from-transparent via-primary to-transparent"
            />
          )}
        </div>

        {/* Scan Status */}
        <div className={`text-center p-3 rounded-xl mb-4 ${
          scanResult?.success ? 'bg-green-50 text-green-700' :
          scanResult?.message ? 'bg-yellow-50 text-yellow-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {scanResult?.success ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Face Verified! Score: {scanResult.score}%</span>
            </div>
          ) : scanResult?.message ? (
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{scanResult.message}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Scanning your face...</span>
            </div>
          )}
        </div>

        {/* Skip option */}
        <div className="text-center">
          <button
            onClick={handleFaceSkip}
            className="text-sm text-body/40 hover:text-primary transition-colors"
          >
            Skip for demo
          </button>
        </div>
      </Card>
    </motion.div>
  )

  const renderSignStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-xl font-bold text-header mb-2">Sign Contract</h2>
      <p className="text-body/60 mb-6">Add your digital signature to finalize</p>

      {/* Verification Status */}
      <div className="flex gap-3 mb-6">
        <div className={`flex-1 p-3 rounded-xl ${nfcData ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2">
            {nfcData ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Nfc className="h-4 w-4 text-body/40" />
            )}
            <span className={`text-sm font-medium ${nfcData ? 'text-green-700' : 'text-body/40'}`}>
              NFC {nfcData ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>
        <div className={`flex-1 p-3 rounded-xl ${faceVerified ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2">
            {faceVerified ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <ScanFace className="h-4 w-4 text-body/40" />
            )}
            <span className={`text-sm font-medium ${faceVerified ? 'text-green-700' : 'text-body/40'}`}>
              Face {faceVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {creatorSignature ? (
        <Card className="text-center" padding="lg">
          <Check className="h-12 w-12 text-status-ongoing mx-auto mb-3" />
          <p className="font-semibold text-header mb-2">Signature Added!</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <img
              src={creatorSignature}
              alt="Your signature"
              className="max-h-24 mx-auto"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreatorSignature(null)}
          >
            Change Signature
          </Button>
        </Card>
      ) : (
        <Card padding="lg">
          <SignaturePad
            onSave={handleSignatureSave}
            width={350}
            height={180}
          />
        </Card>
      )}

      <p className="text-xs text-body/40 text-center mt-4">
        By signing, you agree to the terms and conditions of this contract.
        The acceptee will need to complete verification and sign to activate.
      </p>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Header title="Create Contract" showBack />

      <div className="px-4 py-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
                  ${currentStep > step.id
                    ? 'bg-status-ongoing text-white'
                    : currentStep === step.id
                    ? 'gradient-primary text-white'
                    : 'bg-gray-200 text-body/40'
                  }
                `}
              >
                {currentStep > step.id ? <Check className="h-3 w-3" /> : step.id + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-4 h-0.5 mx-0.5 ${
                    currentStep > step.id ? 'bg-status-ongoing' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 0 && renderCategoryStep()}
          {currentStep === 1 && renderTemplateStep()}
          {currentStep === 2 && renderDetailsStep()}
          {currentStep === 3 && renderReviewStep()}
          {currentStep === 4 && renderNFCStep()}
          {currentStep === 5 && renderFaceVerificationStep()}
          {currentStep === 6 && renderSignStep()}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {currentStep > 0 && currentStep !== 4 && currentStep !== 5 && (
            <Button
              variant="outline"
              onClick={handleBack}
              icon={ArrowLeft}
              className="flex-1"
            >
              Back
            </Button>
          )}
          
          {currentStep >= 2 && currentStep <= 3 && (
            <Button
              onClick={handleNext}
              icon={ArrowRight}
              iconPosition="right"
              className="flex-1"
              disabled={
                (currentStep === 2 && (!formData.name || !formData.accepteeId)) ||
                (currentStep === 3 && !hasConsented)
              }
            >
              {currentStep === 3 ? (hasConsented ? 'Start Verification' : 'Please consent above') : 'Next'}
            </Button>
          )}
          
          {currentStep === 6 && (
            <Button
              onClick={handleCreateContract}
              icon={Check}
              className="flex-1"
              disabled={!creatorSignature}
            >
              Create Contract
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
