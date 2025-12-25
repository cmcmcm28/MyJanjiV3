import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Input, { Select, Textarea } from '../../ui/Input'
import Button from '../../ui/Button'
import { Calendar, User, CreditCard, FileText, CheckCircle, ArrowRight, ArrowLeft, Check, ShoppingBag, Star } from 'lucide-react'
import { calculateTrustScore, getTrustScoreColor, getContractStats, formatTrustScore } from '../../../utils/trustScore'

const steps = [
    { title: 'Basic Details', description: 'Contract info and parties' },
    { title: 'Agreement Details', description: 'Date and parties involved' },
    { title: 'Transaction Details', description: 'What is being deposited for' },
    { title: 'Deposit & Payment', description: 'Amount and payment method' },
    { title: 'Refund Terms', description: 'Refund policy and conditions' },
]

export default function DepositContractForm({ formData, handleChange, acceptees = [] }) {
    const [currentStep, setCurrentStep] = useState(0)

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1)
            window.scrollTo(0, 0)
        }
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
            window.scrollTo(0, 0)
        }
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 1: Basic Details</h4>
                        <Input
                            label="Contract Name"
                            value={formData.name || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="Enter contract name"
                            icon={FileText}
                            required
                        />

                        {/* IC Verification for Acceptee */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-body">
                                Enter Other Party's NRIC / Passport Number
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. 850101-14-5555"
                                    value={formData.accepteeIdNumber || ''}
                                    onChange={(e) => {
                                        handleChange('accepteeIdNumber', e.target.value)
                                        handleChange('accepteeVerified', false)
                                        handleChange('accepteeName', '')
                                        handleChange('accepteeId', '')
                                    }}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => {
                                        const ic = formData.accepteeIdNumber?.trim()
                                        if (!ic) {
                                            handleChange('accepteeError', 'Please enter an IC number')
                                            return
                                        }
                                        const found = acceptees.find(u =>
                                            u.ic === ic ||
                                            u.ic?.replace(/-/g, '') === ic.replace(/-/g, '')
                                        )
                                        if (found) {
                                            handleChange('accepteeId', found.id)
                                            handleChange('accepteeName', found.name)
                                            handleChange('accepteeVerified', true)
                                            handleChange('accepteeError', '')
                                        } else {
                                            handleChange('accepteeVerified', false)
                                            handleChange('accepteeName', '')
                                            handleChange('accepteeId', '')
                                            handleChange('accepteeError', 'No user found with this IC number')
                                        }
                                    }}
                                >
                                    Verify
                                </Button>
                            </div>
                            <p className="text-xs text-body/60">Enter the other party's IC to verify their identity</p>
                        </div>

                        {formData.accepteeError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                ❌ {formData.accepteeError}
                            </div>
                        )}

                        {formData.accepteeVerified && formData.accepteeName && (() => {
                            // Calculate trust score
                            const accepteeUser = acceptees.find(u => u.id === formData.accepteeId)
                            const accepteeStats = getContractStats(accepteeUser?.contracts || [], formData.accepteeId)
                            const trustScore = calculateTrustScore(accepteeStats)
                            const trustColors = getTrustScoreColor(trustScore)

                            return (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Check className="h-5 w-5 text-green-600" />
                                        <span className="font-semibold text-green-700">Party Verified!</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <span className="text-body/60">Name:</span>
                                            <p className="font-medium text-header">{formData.accepteeName}</p>
                                        </div>
                                        <div>
                                            <span className="text-body/60">IC Number:</span>
                                            <p className="font-medium text-header">{formData.accepteeIdNumber}</p>
                                        </div>
                                        <div>
                                            <span className="text-body/60">Trust Score:</span>
                                            <div className="flex items-center gap-1">
                                                <Star className={`h-4 w-4 ${trustColors.text}`} fill="currentColor" />
                                                <span className={`font-bold ${trustColors.text}`}>
                                                    {formatTrustScore(trustScore)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        <Textarea
                            label="Topic / Description"
                            value={formData.topic || ''}
                            onChange={(e) => handleChange('topic', e.target.value)}
                            placeholder="Brief description of the contract"
                            rows={2}
                        />
                    </div>
                )
            case 1:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 1: Agreement Details</h4>

                        <Input
                            label="Agreement Date"
                            type="date"
                            value={formData.agreementDate || ''}
                            onChange={(e) => handleChange('agreementDate', e.target.value)}
                            required
                        />

                        <div className="space-y-4 pt-4">
                            <h5 className="font-medium text-gray-700">Depositor Information</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Depositor Name"
                                    placeholder="Full Name"
                                    value={formData.depositorName || ''}
                                    onChange={(e) => handleChange('depositorName', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Depositor NRIC / Passport"
                                    placeholder="e.g. 901212-14-5555"
                                    value={formData.depositorNric || ''}
                                    onChange={(e) => handleChange('depositorNric', e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h5 className="font-medium text-gray-700">Recipient (Borrower) Information</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Recipient Name"
                                    placeholder="Full Name / Company"
                                    value={formData.recipientName || ''}
                                    onChange={(e) => handleChange('recipientName', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Recipient NRIC / Reg No"
                                    placeholder="e.g. 202001009999"
                                    value={formData.recipientNric || ''}
                                    onChange={(e) => handleChange('recipientNric', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 2: Transaction Details</h4>

                        <Textarea
                            label="What is the deposit for? (Transaction Description)"
                            placeholder="e.g. Purchase of a 2018 Honda Civic or Freelance Web Development Services"
                            value={formData.transactionDescription || ''}
                            onChange={(e) => handleChange('transactionDescription', e.target.value)}
                            required
                            rows={4}
                        />

                        <Input
                            label="Total Transaction Value (RM)"
                            type="number"
                            placeholder="0.00"
                            value={formData.totalTransactionAmount || ''}
                            onChange={(e) => handleChange('totalTransactionAmount', e.target.value)}
                            icon={CreditCard}
                            helperText="Optional if this is just a partial placement"
                        />

                        <Textarea
                            label="How will the remaining balance be paid?"
                            placeholder="e.g. 50% upon completion or In monthly installments of RM1,000"
                            value={formData.balancePaymentTerms || ''}
                            onChange={(e) => handleChange('balancePaymentTerms', e.target.value)}
                            rows={3}
                        />
                    </div>
                )
            case 3:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 3: Deposit & Payment</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Deposit Amount (RM)"
                                type="number"
                                placeholder="0.00"
                                value={formData.depositAmount || ''}
                                onChange={(e) => handleChange('depositAmount', e.target.value)}
                                required
                                icon={CreditCard}
                            />

                            <Select
                                label="Payment Method"
                                value={formData.paymentMethod || ''}
                                onChange={(e) => handleChange('paymentMethod', e.target.value)}
                                options={[
                                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                                    { value: 'DuitNow', label: 'DuitNow' },
                                    { value: 'Cash', label: 'Cash' },
                                    { value: 'Cheque', label: 'Cheque' }
                                ]}
                                placeholder="Select method"
                                required
                            />
                        </div>

                        <Input
                            label="Deposit Deadline"
                            type="date"
                            value={formData.depositDeadline || ''}
                            onChange={(e) => handleChange('depositDeadline', e.target.value)}
                            icon={Calendar}
                            required
                        />
                    </div>
                )
            case 4:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 4: Refund Terms</h4>

                        <Select
                            label="Is this deposit refundable?"
                            value={formData.refundStatus || ''}
                            onChange={(e) => handleChange('refundStatus', e.target.value)}
                            options={[
                                { value: 'Refundable', label: 'Refundable' },
                                { value: 'Non-refundable', label: 'Non-refundable' }
                            ]}
                            placeholder="Select status"
                            required
                        />

                        {formData.refundStatus === 'Refundable' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Input
                                    label="If refundable, within how many days?"
                                    type="number"
                                    placeholder="e.g. 7"
                                    value={formData.refundDays || ''}
                                    onChange={(e) => handleChange('refundDays', e.target.value)}
                                    helperText="Number of days the Recipient has to return the money"
                                />
                            </motion.div>
                        )}

                        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100 mt-4">
                            <p className="font-semibold mb-1">Note:</p>
                            <p>Clear refund terms help prevent disputes later. Ensure both parties agree on the refund conditions.</p>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    const progress = ((currentStep + 1) / steps.length) * 100

    return (
        <div className="flex flex-col lg:flex-row gap-8 py-4">
            {/* Sidebar Progress (Desktop) */}
            <div className="lg:w-64 flex-shrink-0">
                <div className="sticky top-4">
                    <div className="mb-4">
                        <h3 className="font-bold text-header text-lg">Deposit Contract</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {steps.map((step, index) => {
                            const isActive = index === currentStep
                            const isCompleted = index < currentStep

                            return (
                                <button
                                    key={index}
                                    onClick={() => setCurrentStep(index)}
                                    disabled={!isCompleted && !isActive}
                                    className={`
                                        w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all
                                        ${isActive ? 'bg-primary/5 text-primary' : 'text-body/60'}
                                        ${isCompleted ? 'hover:bg-gray-50' : 'cursor-not-allowed'}
                                    `}
                                >
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                                        ${isActive ? 'bg-primary text-white' : ''}
                                        ${isCompleted ? 'bg-green-500 text-white' : ''}
                                        ${!isActive && !isCompleted ? 'bg-gray-100' : ''}
                                    `}>
                                        {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-primary' : ''}`}>
                                            {step.title}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-[500px] flex flex-col">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 p-1"
                >
                    {renderStepContent()}
                </motion.div>

                <div className="flex items-center justify-between pt-6 mt-8 border-t border-gray-100">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleBack}
                        className={currentStep === 0 ? 'invisible' : ''}
                        icon={ArrowLeft}
                    >
                        Back
                    </Button>

                    {currentStep < steps.length - 1 ? (
                        <Button type="button" onClick={handleNext}>
                            Next Step <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    ) : (
                        <div className="text-sm text-gray-500 italic">
                            Complete the form above to proceed
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
