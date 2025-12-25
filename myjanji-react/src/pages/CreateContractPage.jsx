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
import { users, contractCategories as fallbackCategories } from '../utils/dummyData'
import { templateService } from '../services/supabase/templateService'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input, { Textarea, Select } from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import SignaturePad from '../components/features/SignaturePad'
import NFCScanner from '../components/features/NFCScanner'
import PDFPreviewModal from '../components/features/PDFPreviewModal'
import faceAuthService from '../services/faceAuthService'
import { storageService } from '../services/supabase/storageService'
import FreelanceContractForm from '../components/contracts/templates/FreelanceContractForm'
import DepositContractForm from '../components/contracts/templates/DepositContractForm'
import LoanContractForm from '../components/contracts/templates/LoanContractForm'
import VehicleLoanContractForm from '../components/contracts/templates/VehicleLoanContractForm'

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
  const { currentUser, availableUsers } = useAuth()
  const { addContract, updateContract } = useContracts()
  const webcamRef = useRef(null)

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  // Dynamic categories from Supabase
  const [contractCategories, setContractCategories] = useState(fallbackCategories)
  const [loadingCategories, setLoadingCategories] = useState(true)
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
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [hasConsented, setHasConsented] = useState(false)
  const [prepareId, setPrepareId] = useState(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const availableAcceptees = (availableUsers || Object.values(users)).filter(u => u.id !== currentUser?.id)

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
      // Clear acceptee fields when switching templates
      accepteeId: '',
      accepteeName: '',
      accepteeIdNumber: '',
      accepteeVerified: false,
      accepteeError: '',
    }))
    setCurrentStep(2)
  }

  // Backend URL for contract preparation
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

  // Build placeholders for contract template
  // IMPORTANT: Keys must match the {{placeholder}} names in the Word template (lowercase with underscores)
  const buildPlaceholders = () => {
    const acceptee = availableUsers?.find(u => u.id === formData.accepteeId) || users[formData.accepteeId]

    return {
      // Parties - lowercase to match Word templates
      // Use form data first (from VehicleLoanContractForm), then fallback to user lookup
      creator_name: formData?.creatorName || currentUser?.name || '',
      creator_id_number: formData?.creatorIdNumber || currentUser?.ic || '',
      acceptee_name: formData?.accepteeName || acceptee?.name || '',
      acceptee_id_number: formData?.accepteeIdNumber || acceptee?.ic || '',

      // Dates - use form data values, not hardcoded current date
      start_date: formData?.startDate || '',
      end_date: formData?.endDate || formData?.returnDate || formData?.dueDate || '',
      return_date: formData?.returnDate || formData?.dueDate || '',
      due_date: formData?.dueDate || '',
      effective_date: formData?.effectiveDate || new Date().toISOString().split('T')[0],
      signing_date: formData?.signingDate || new Date().toISOString().split('T')[0],

      // Items/Assets (Item Borrowing & Vehicle)
      item_name: formData?.item || formData?.name || '',
      item_description: formData?.description || '',
      item_condition: formData?.condition || 'Good',
      item_value: formData?.value || '',
      equipment_list: formData?.equipmentList || formData?.vehicleList || '',
      replacement_value: formData?.replacementValue || formData?.value || '',
      rental_fee: formData?.rentalFee || '',
      payment_frequency: formData?.paymentFrequency || '',

      // Money
      amount: formData?.amount || '',
      interest_rate: formData?.interestRate || '0',
      payment_terms: formData?.paymentTerms || '',

      // Vehicle specific
      vehicle_list: formData?.vehicleList || formData?.model || '',
      vehicle_model: formData?.model || '',
      vehicle_plate: formData?.plate || '',
      fuel: formData?.fuel || '',

      // Freelance Contract specific
      company_name: formData?.companyName || '',
      comp_reg_no: formData?.companyRegNumber || '',
      company_address: formData?.companyAddress || '',
      hirer_name: formData?.companySignatory || currentUser?.name || '',
      hirer_id_number: currentUser?.ic || '', // Use current user's IC as hirer
      contractor_name: formData?.contractorName || '',
      contractor_id_number: formData?.contractorIc || '',
      contractor_address: formData?.contractorAddress || '',
      service_description: formData?.scopeOfWork || '',
      supervisor_name: formData?.supervisorName || '',
      payment_amount: formData?.paymentAmount || '',
      invoicing_frequency: formData?.invoicingFrequency || '',
      payment_deadline_days: formData?.paymentDeadlineDays || '',
      termination_notice_days: formData?.noticePeriodDays || '',

      // Deposit Contract specific
      depositor_name: formData?.depositorName || '',
      depositor_nric: formData?.depositorNric || '',
      recipient_name: formData?.recipientName || '',
      recipient_nric: formData?.recipientNric || '',
      date: formData?.agreementDate || new Date().toISOString().split('T')[0],
      transaction_description: formData?.transactionDescription || '',
      deposit_amount: formData?.depositAmount || '',
      payment_method: formData?.paymentMethod || '',
      deposit_deadline: formData?.depositDeadline || '',
      total_transaction_amount: formData?.totalTransactionAmount || '',
      balance_payment_terms: formData?.balancePaymentTerms || '',
      refund_status: formData?.refundStatus || '',
      refund_days: formData?.refundDays || '',

      // Additional
      terms: formData?.terms || '',
      notes: formData?.notes || '',

      // Spread form data for any template-specific fields (in camelCase - backend mapping will handle)
      ...formData,
    }
  }

  // Prepare contract when moving from Step 2 (Details) to Step 3 (Review)
  const prepareContract = async () => {
    if (!selectedTemplate?.id) return false

    setIsPreparing(true)
    console.log('📋 Preparing contract for template:', selectedTemplate.id)

    try {
      const placeholders = buildPlaceholders()

      const response = await fetch(`${BACKEND_URL}/prepare_contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: selectedTemplate.id,
          placeholders: placeholders,
        }),
      })

      const result = await response.json()

      if (result.success && result.prepare_id) {
        console.log('✅ Contract prepared with ID:', result.prepare_id)
        setPrepareId(result.prepare_id)
        return true
      } else {
        console.error('❌ Failed to prepare contract:', result.error || result.message)
        return false
      }
    } catch (err) {
      console.error('❌ Error preparing contract:', err)
      return false
    } finally {
      setIsPreparing(false)
    }
  }

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      // When moving from Step 2 (Details) to Step 3 (Review), prepare the contract
      if (currentStep === 2) {
        const prepared = await prepareContract()
        if (!prepared) {
          console.warn('⚠️ Contract preparation failed, but continuing...')
        }
      }
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

  const handleNFCError = (error) => {
    console.error('NFC verification failed:', error)
    // Keep user on NFC step to retry - the NFCScanner component handles the UI
    setNfcData(null)
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

    // Use verifyLogin to compare with stored face embedding from Supabase
    // This matches the LoginPage logic exactly
    const storedEmbedding = currentUser?.faceEmbedding

    if (!storedEmbedding) {
      console.warn('⚠️ No stored face embedding found for user.')
      setScanResult({ success: false, message: 'No face registered for this user' })
      return
    }

    // Call verifyLogin with stored embedding (same as LoginPage)
    const result = await faceAuthService.verifyLogin(imageSrc, storedEmbedding)

    // Update score display
    if (result.score !== undefined && result.score !== null) {
      console.log('📊 Face match score:', result.score)
    }

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
  }, [isScanning, currentUser?.faceEmbedding])

  // Fetch categories from Supabase on mount
  useEffect(() => {
    console.log('Component mounted, fallback categories length:', fallbackCategories?.length)
    const fetchCategories = async () => {
      setLoadingCategories(true)
      try {
        console.log('Fetching categories from Supabase...')
        const { data, error } = await templateService.getCategories()
        console.log('Supabase response:', { data, error })

        if (data && !error && data.length > 0) {
          setContractCategories(data)
          console.log('✅ Loaded categories from Supabase:', data.length)
        } else {
          console.warn('⚠️ Supabase returned empty/error, using fallback categories. Fallback length:', fallbackCategories?.length)
          setContractCategories(fallbackCategories)
        }
      } catch (err) {
        console.error('Error fetching categories:', err)
        setContractCategories(fallbackCategories)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

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

  const handleCreateContract = async () => {
    if (!creatorSignature || !currentUser) return

    setIsCreating(true)
    try {
      // If we have a prepareId, use the backend to finalize the contract
      if (prepareId) {
        console.log('📝 Finalizing contract via backend...')

        const response = await fetch(`${BACKEND_URL}/create_contract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prepare_id: prepareId,
            user_id: currentUser.id,
            acceptee_id: formData.accepteeId,
            contract_name: formData.name || selectedTemplate?.name || 'Untitled Contract',
            contract_topic: formData.topic || selectedTemplate?.description || '',
            template_type: selectedTemplate?.id,
            form_data: buildPlaceholders(), // Use buildPlaceholders() for proper snake_case keys
            creator_signature: creatorSignature,
            creator_name: currentUser.name || currentUser.fullName || '',
            creator_ic: currentUser.ic || currentUser.icNumber || '',
            creator_nfc_verified: nfcData ? true : false,
            creator_face_verified: faceVerified,
            due_date: formData.dueDate || null,
          }),
        })

        const result = await response.json()

        if (result.success) {
          console.log('✅ Contract created:', result.contract_id)

          // Transform to match frontend contract structure
          const createdContract = {
            id: result.contract_id,
            name: formData.name || selectedTemplate?.name || 'Untitled Contract',
            topic: formData.topic || selectedTemplate?.description || '',
            userId: currentUser.id,
            accepteeId: formData.accepteeId,
            status: 'Pending',
            templateType: selectedTemplate?.id,
            formData: { ...formData },
            creatorSignature: creatorSignature,
            pdfUrl: result.pdf_url,
            signatureDate: new Date(),
            creatorNfcVerified: nfcData ? true : false,
            creatorFaceVerified: faceVerified,
          }

          // Navigate to contract created page
          navigate('/contract-created', { state: { contract: createdContract } })
          return
        } else {
          console.error('❌ Backend contract creation failed:', result.error)
          // Fall through to local creation
        }
      }

      // Fallback: Use local contract creation if backend fails or no prepareId
      console.log('⚠️ Using fallback local contract creation...')

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
        creatorNfcVerified: nfcData ? true : false,
        creatorFaceVerified: faceVerified,
      }

      const createdContract = await addContract(newContract)
      const contractId = createdContract.id

      // Upload signature
      try {
        const base64Data = creatorSignature.split(',')[1] || creatorSignature
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/png' })
        const file = new File([blob], `signature-${contractId}.png`, { type: 'image/png' })

        const { data: uploadData, error: uploadError } = await storageService.uploadSignature(
          currentUser.id,
          contractId,
          file,
          'creator'
        )

        if (!uploadError && uploadData) {
          await updateContract(contractId, {
            creatorSignature: uploadData.url
          })
        }
      } catch (uploadError) {
        console.error('Error uploading signature:', uploadError)
      }

      navigate('/contract-created', { state: { contract: createdContract } })
    } catch (error) {
      console.error('Error creating contract:', error)
      // Last resort fallback
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
        creatorNfcVerified: nfcData ? true : false,
        creatorFaceVerified: faceVerified,
      }
      const createdContract = await addContract(newContract)
      navigate('/contract-created', { state: { contract: createdContract } })
    } finally {
      setIsCreating(false)
    }
  }

  const renderCategoryStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-xl font-bold text-header mb-2">Choose a Category</h2>
      <p className="text-body/60 mb-6">Select the type of agreement you want to create</p>

      {loadingCategories ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-mid mb-3" />
          <p className="text-body/60">Loading contract templates...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contractCategories.map((category) => {
            const CategoryIcon = iconMap[category.icon] || Package
            return (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCategorySelect(category)}
                className={`
                w-full text-left rounded-3xl overflow-hidden transition-all shadow-lg
                ${selectedCategory?.id === category.id
                    ? 'ring-2 ring-accent'
                    : 'hover:shadow-2xl'
                  }
              `}
              >
                <div className={`bg-gradient-to-r ${category.color} p-5 text-white`}>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                      <CategoryIcon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{category.name}</h3>
                      <p className="text-white/80 text-sm">{category.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="bg-white p-4 border-x border-b border-gray-100">
                  <div className="flex gap-2 flex-wrap">
                    {category.templates.map((t) => {
                      const TIcon = iconMap[t.icon] || FileText
                      return (
                        <span key={t.id} className="inline-flex items-center gap-1.5 text-xs text-body/70 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                          <TIcon className="h-3 w-3" strokeWidth={1.5} />
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
      )}
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
              whileHover={{ scale: 1.02, y: -2, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTemplateSelect(template)}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                ${selectedTemplate?.id === template.id
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-gray-200 hover:border-primary/50 bg-white hover:bg-primary/5'
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
      {selectedTemplate?.id !== 'FREELANCE_JOB' && selectedTemplate?.id !== 'SALE_DEPOSIT' && selectedTemplate?.id !== 'ITEM_BORROW' && selectedTemplate?.id !== 'VEHICLE_USE' && (
        <>
          <Input
            label="Contract Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter contract name"
            icon={FileText}
            required
            tooltip="Give your contract a descriptive name that both parties can recognize"
            isValid={formData.name?.length >= 3}
          />
          <Select
            label="Select Acceptee (Other Party)"
            value={formData.accepteeId}
            onChange={(e) => handleInputChange('accepteeId', e.target.value)}
            options={availableAcceptees.map(u => ({ value: u.id, label: `${u.name} (${u.ic})` }))}
            placeholder="Choose the other party"
            required
            tooltip="The person you're entering this contract with"
            isValid={!!formData.accepteeId}
          />
        </>
      )}

      {/* Template-specific fields */}
      {selectedTemplate?.id === 'VEHICLE_USE' && (
        <VehicleLoanContractForm
          formData={formData}
          handleChange={handleInputChange}
          acceptees={availableAcceptees}
          currentUser={currentUser}
        />
      )}

      {
        selectedTemplate?.id === 'ITEM_BORROW' && (
          <LoanContractForm
            formData={formData}
            handleChange={handleInputChange}
            acceptees={availableAcceptees}
            currentUser={currentUser}
          />
        )
      }

      {
        selectedTemplate?.id === 'BILL_SPLIT' && (
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
              required
              tooltip="Describe what the expense was for"
              isValid={formData.description?.length >= 3}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Total Bill (RM)"
                type="number"
                value={formData.total}
                onChange={(e) => handleInputChange('total', e.target.value)}
                placeholder="100"
                required
                tooltip="The full amount of the bill"
                isValid={parseFloat(formData.total) > 0}
              />
              <Input
                label="Their Share (RM)"
                type="number"
                value={formData.share}
                onChange={(e) => handleInputChange('share', e.target.value)}
                placeholder="50"
                required
                tooltip="The amount the other party should pay"
                isValid={parseFloat(formData.share) > 0 && parseFloat(formData.share) <= parseFloat(formData.total)}
              />
            </div>
            <Input
              label="Settlement Date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              icon={Calendar}
              required
              tooltip="When should the payment be made?"
              isValid={!!formData.date}
            />
          </>
        )
      }

      {
        selectedTemplate?.id === 'FRIENDLY_LOAN' && (
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
              required
              tooltip="The amount being lent"
              isValid={parseFloat(formData.amount) > 0}
            />
            <Input
              label="Purpose of Loan"
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              placeholder="e.g., Emergency expenses, Education"
              required
              tooltip="Why is this loan needed? This helps with documentation"
              isValid={formData.purpose?.length >= 3}
            />
            <Input
              label="Repayment Date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              icon={Calendar}
              required
              tooltip="When should the loan be repaid in full?"
              isValid={!!formData.date}
            />
          </>
        )
      }

      {
        selectedTemplate?.id === 'FREELANCE_JOB' && (
          <FreelanceContractForm
            formData={formData}
            handleChange={handleInputChange}
            acceptees={availableAcceptees}
          />
        )
      }

      {
        selectedTemplate?.id === 'SALE_DEPOSIT' && (
          <DepositContractForm
            formData={formData}
            handleChange={handleInputChange}
            acceptees={availableAcceptees}
          />
        )
      }
    </motion.div >
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
              {formData.accepteeId && (availableUsers?.find(u => u.id === formData.accepteeId) || users[formData.accepteeId]) ? (
                <>
                  <img
                    src={(availableUsers?.find(u => u.id === formData.accepteeId) || users[formData.accepteeId])?.avatar}
                    alt={(availableUsers?.find(u => u.id === formData.accepteeId) || users[formData.accepteeId])?.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <p className="font-medium text-header text-sm">
                    {(availableUsers?.find(u => u.id === formData.accepteeId) || users[formData.accepteeId])?.name}
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
            icon={isPreparing ? Loader2 : Eye}
            className={`w-full ${isPreparing ? 'animate-pulse' : ''}`}
            disabled={isPreparing}
          >
            {isPreparing ? 'Generating PDF...' : 'Preview Contract (PDF)'}
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
        formData={{ ...formData, creatorSignature }}
        creator={currentUser}
        acceptee={availableUsers?.find(u => u.id === formData.accepteeId) || users[formData.accepteeId] || null}
        title={`Preview: ${formData.name || selectedTemplate?.name}`}
        prepareId={prepareId}
        isPreparing={isPreparing}
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
          onError={handleNFCError}
          onSkip={handleNFCSkip}
          title="Verify Your Identity"
          description="Scan your MyKad NFC chip to verify your identity before signing"
          expectedChipId={currentUser?.nfcChipId}
          userName={currentUser?.name}
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
      <Card className="max-w-md mx-auto" padding="lg">
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
            <div className={`w-48 h-60 border-4 rounded-full transition-colors duration-300 ${scanResult?.success ? 'border-green-500' :
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
        <div className={`text-center p-3 rounded-xl mb-4 ${scanResult?.success ? 'bg-green-50 text-green-700' :
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
    </motion.div >
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
        {/* Progress Steps - Clickable */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            // Determine if step is clickable (only completed steps or current step)
            const isCompleted = currentStep > step.id
            const isCurrent = currentStep === step.id
            const isClickable = isCompleted || (step.id < currentStep)
            
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => {
                    // Only allow going back to completed steps
                    if (step.id < currentStep) {
                      setCurrentStep(step.id)
                    }
                  }}
                  disabled={step.id > currentStep}
                  className={`
                    w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0
                    transition-all duration-300
                    ${isCompleted
                      ? 'icon-container-primary text-white shadow-md hover:scale-110 hover:shadow-lg cursor-pointer'
                      : isCurrent
                        ? 'icon-container-primary text-white shadow-lg scale-105'
                        : 'icon-container text-body/40 cursor-not-allowed'
                    }
                  `}
                  title={isCompleted ? `Go back to ${step.label}` : step.label}
                >
                  {isCompleted ? <Check className="h-3 w-3" strokeWidth={2} /> : step.id + 1}
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`w-4 h-1 mx-0.5 rounded-full transition-all duration-300 ${isCompleted ? 'bg-gradient-to-r from-primary-mid to-accent' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            )
          })}
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
              icon={isPreparing ? Loader2 : ArrowRight}
              iconPosition="right"
              className={`flex-1 ${isPreparing ? 'animate-pulse' : ''}`}
              disabled={
                isPreparing ||
                (currentStep === 2 && (!formData.name || !formData.accepteeId)) ||
                (currentStep === 3 && !hasConsented)
              }
            >
              {isPreparing ? 'Generating PDF...' : currentStep === 3 ? (hasConsented ? 'Start Verification' : 'Please consent above') : 'Next'}
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

      {/* Typewriter Loading Modal */}
      <Modal isOpen={isPreparing || isCreating} onClose={() => {}} title="">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="typewriter">
            <div className="slide"><i></i></div>
            <div className="paper"></div>
            <div className="keyboard"></div>
          </div>
          <p className="mt-8 text-lg font-semibold text-gray-700">Hang on!</p>
        </div>
      </Modal>
    </div>
  )
}
