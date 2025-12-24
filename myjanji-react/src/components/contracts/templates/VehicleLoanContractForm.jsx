import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Input, { Select, Textarea } from '../../ui/Input'
import Button from '../../ui/Button'
import { Calendar, User, DollarSign, Package, Shield, FileText, Check, ArrowRight, ArrowLeft, Car } from 'lucide-react'

const steps = [
    { title: 'Basic Details', description: 'Contract info' },
    { title: 'Agreement Details', description: 'Dates and duration' },
    { title: 'Vehicle Owner', description: 'Lender details' },
    { title: 'Borrower', description: 'Borrower info' },
    { title: 'Vehicle Details', description: 'Vehicle & Liability' },
    { title: 'Costs & Payment', description: 'Fees and schedule' },
]

export default function VehicleLoanContractForm({ formData, handleChange, acceptees = [], currentUser = null }) {
    const [currentStep, setCurrentStep] = useState(0)

    // Pre-fill vehicle owner (lender) information with current user's data
    useEffect(() => {
        if (currentUser) {
            // Only pre-fill if fields are empty
            if (!formData.creatorName && currentUser.name) {
                handleChange('creatorName', currentUser.name)
            }
            if (!formData.creatorIdNumber && currentUser.ic) {
                handleChange('creatorIdNumber', currentUser.ic)
            }
        }
    }, [currentUser])

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
                        <h4 className="font-semibold text-header text-xl mb-4">Step 1: Basic Information</h4>

                        <Input
                            label="Contract Name"
                            value={formData.name || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="e.g. Car Rental Agreement"
                            icon={FileText}
                            required
                        />

                        <Textarea
                            label="Topic / Description"
                            value={formData.topic || ''}
                            onChange={(e) => handleChange('topic', e.target.value)}
                            placeholder="Brief description of the vehicle loan"
                            rows={2}
                        />
                    </div>
                )
            case 1:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 2: Agreement Dates</h4>

                        <Input
                            label="Effective Date"
                            type="date"
                            value={formData.effectiveDate || ''}
                            onChange={(e) => handleChange('effectiveDate', e.target.value)}
                            required
                            helperText="Date this agreement takes effect."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Lending Start Date"
                                type="date"
                                value={formData.startDate || ''}
                                onChange={(e) => handleChange('startDate', e.target.value)}
                                required
                            />
                            <Input
                                label="Lending End Date"
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
                        <h4 className="font-semibold text-header text-xl mb-4">Step 3: Vehicle Owner (Lender)</h4>

                        <Input
                            label="Who is the Vehicle Owner (Lender)?"
                            placeholder="Full Legal Name"
                            value={formData.creatorName || ''}
                            onChange={(e) => handleChange('creatorName', e.target.value)}
                            required
                            helperText="This should be you, the current user."
                        />

                        <Input
                            label="Owner's NRIC or Passport Number"
                            placeholder="e.g. 850101-14-5555"
                            value={formData.creatorIdNumber || ''}
                            onChange={(e) => handleChange('creatorIdNumber', e.target.value)}
                            required
                        />
                    </div>
                )
            case 3:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 4: Select Acceptee (Borrower)</h4>

                        <Select
                            label="Who is borrowing the vehicle?"
                            value={formData.accepteeId || ''}
                            onChange={(e) => {
                                const selectedId = e.target.value
                                handleChange('accepteeId', selectedId)
                                const selectedUser = acceptees.find(u => u.id === selectedId)
                                if (selectedUser) {
                                    handleChange('accepteeName', selectedUser.name)
                                    handleChange('accepteeIdNumber', selectedUser.ic || selectedUser.user_id || '')
                                }
                            }}
                            options={acceptees.map(u => ({ value: u.id, label: `${u.name} (${u.ic})` }))}
                            placeholder="Select Borrower"
                            required
                        />

                        <Input
                            label="Borrower's Name"
                            placeholder="Checking..."
                            value={formData.accepteeName || ''}
                            onChange={(e) => handleChange('accepteeName', e.target.value)}
                            helperText="Auto-filled from selection."
                        />

                        <Input
                            label="Borrower's NRIC / Passport"
                            placeholder="Checking..."
                            value={formData.accepteeIdNumber || ''}
                            onChange={(e) => handleChange('accepteeIdNumber', e.target.value)}
                        />
                    </div>
                )
            case 4:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 5: Vehicle Details & Liability</h4>

                        <Textarea
                            label="List the Vehicle(s) being loaned"
                            placeholder="e.g. Honda City - VAA 1234"
                            value={formData.vehicleList || ''}
                            onChange={(e) => handleChange('vehicleList', e.target.value)}
                            rows={3}
                            required
                        />

                        <Input
                            label="Total Replacement Value (RM)"
                            type="number"
                            placeholder="e.g. 250000"
                            value={formData.replacementValue || ''}
                            onChange={(e) => handleChange('replacementValue', e.target.value)}
                            icon={DollarSign}
                            helperText="Value to be paid if vehicle is lost or totalled."
                        />
                    </div>
                )
            case 5:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 6: Costs & Payment</h4>

                        <Input
                            label="Rental Fee Amount (RM)"
                            type="number"
                            placeholder="500.00"
                            value={formData.rentalFee || ''}
                            onChange={(e) => handleChange('rentalFee', e.target.value)}
                            icon={DollarSign}
                            required
                        />

                        <Select
                            label="How often is this fee charged?"
                            value={formData.paymentFrequency || ''}
                            onChange={(e) => handleChange('paymentFrequency', e.target.value)}
                            options={[
                                { value: 'Per Day', label: 'Per Day' },
                                { value: 'Per Week', label: 'Per Week' },
                                { value: 'Per Month', label: 'Per Month' },
                                { value: 'One-time', label: 'One-time' }
                            ]}
                            placeholder="Select Frequency"
                            required
                        />
                        <Input
                            label="Signing Date"
                            type="date"
                            value={formData.signingDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => handleChange('signingDate', e.target.value)}
                            helperText="Date of signing."
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
                        <h3 className="font-bold text-header text-lg">Vehicle Loan</h3>
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
