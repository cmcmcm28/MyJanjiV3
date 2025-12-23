import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Input, { Select, Textarea } from '../../ui/Input'
import Button from '../../ui/Button'
import { Calendar, User, DollarSign, Package, Shield, FileText, Check, ArrowRight, ArrowLeft } from 'lucide-react'

const steps = [
    { title: 'Basic Details', description: 'Contract info' },
    { title: 'Agreement Details', description: 'Dates and duration' },
    { title: 'Lender Information', description: 'Equipment owner details' },
    { title: 'Borrower Information', description: 'Recipient details' },
    { title: 'Equipment & Liability', description: 'Item details and value' },
    { title: 'Payment Terms', description: 'Rental fees and schedule' },
]

export default function LoanContractForm({ formData, handleChange, acceptees = [] }) {
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

                        <Textarea
                            label="Topic / Description"
                            value={formData.topic || ''}
                            onChange={(e) => handleChange('topic', e.target.value)}
                            placeholder="Brief description of the loan"
                            rows={2}
                        />
                    </div>
                )
            case 1:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 2: Agreement Details</h4>

                        <Input
                            label="Effective Date"
                            type="date"
                            value={formData.effectiveDate || ''}
                            onChange={(e) => handleChange('effectiveDate', e.target.value)}
                            required
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Loan Start Date"
                                type="date"
                                value={formData.startDate || ''}
                                onChange={(e) => handleChange('startDate', e.target.value)}
                                required
                            />
                            <Input
                                label="Loan End Date"
                                type="date"
                                value={formData.endDate || ''}
                                onChange={(e) => handleChange('endDate', e.target.value)}
                                required
                            />
                        </div>
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 3: Lender Information (The Owner)</h4>

                        <Input
                            label="Who is lending the equipment? (Full Legal Name)"
                            placeholder="John Doe"
                            value={formData.creatorName || ''}
                            onChange={(e) => handleChange('creatorName', e.target.value)}
                            required
                        />

                        <Input
                            label="Lender's NRIC or Passport Number"
                            placeholder="e.g. 901212-14-5555"
                            value={formData.creatorIdNumber || ''}
                            onChange={(e) => handleChange('creatorIdNumber', e.target.value)}
                            required
                        />
                    </div>
                )
            case 3:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 4: Borrower Information (The Recipient)</h4>

                        <Select
                            label="Who is borrowing the equipment?"
                            value={formData.accepteeId || ''}
                            onChange={(e) => handleChange('accepteeId', e.target.value)}
                            options={acceptees.map(u => ({ value: u.id, label: `${u.name} (${u.ic})` }))}
                            placeholder="Select Borrower"
                            required
                        />

                        <Input
                            label="Borrower's Full Legal Name"
                            placeholder="Checking..."
                            value={formData.accepteeName || ''}
                            onChange={(e) => handleChange('accepteeName', e.target.value)}
                            helperText="Will be auto-filled from selection if available"
                        />

                        <Input
                            label="Borrower's NRIC or Passport Number"
                            placeholder="Checking..."
                            value={formData.accepteeIdNumber || ''}
                            onChange={(e) => handleChange('accepteeIdNumber', e.target.value)}
                        />
                    </div>
                )
            case 4:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 5: Equipment & Liability</h4>

                        <Textarea
                            label="List the Equipment being loaned"
                            placeholder="Include model names and serial numbers if available."
                            value={formData.equipmentList || ''}
                            onChange={(e) => handleChange('equipmentList', e.target.value)}
                            rows={5}
                            required
                        />

                        <Input
                            label="Total Replacement Value (RM)"
                            type="number"
                            placeholder="0.00"
                            value={formData.replacementValue || ''}
                            onChange={(e) => handleChange('replacementValue', e.target.value)}
                            icon={DollarSign}
                            helperText="If lost/damaged, how much must the borrower pay?"
                        />
                    </div>
                )
            case 5:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 6: Payment Terms</h4>

                        <Input
                            label="Rental Fee Amount (RM)"
                            type="number"
                            placeholder="0.00"
                            value={formData.rentalFee || ''}
                            onChange={(e) => handleChange('rentalFee', e.target.value)}
                            icon={DollarSign}
                        />

                        <Select
                            label="How often is this fee charged?"
                            value={formData.paymentFrequency || ''}
                            onChange={(e) => handleChange('paymentFrequency', e.target.value)}
                            options={[
                                { value: 'Per Day', label: 'Per Day' },
                                { value: 'Per Week', label: 'Per Week' },
                                { value: 'Per Month', label: 'Per Month' },
                                { value: 'Flat Fee', label: 'Flat Fee' }
                            ]}
                            placeholder="Select Frequency"
                        />
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
                        <h3 className="font-bold text-header text-lg">Equipment Loan</h3>
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
