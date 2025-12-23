import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Input, { Textarea, Select } from '../../ui/Input'
import Button from '../../ui/Button'
import { DollarSign, MapPin, Calendar, Check, ArrowRight, ArrowLeft, FileText } from 'lucide-react'

const steps = [
    { title: 'Basic Details', description: 'Contract info and parties' },
    { title: 'Client Information', description: 'Details of the hiring party' },
    { title: 'Contractor Details', description: 'Details of the independent contractor' },
    { title: 'Services & Supervision', description: 'Scope of work and reporting' },
    { title: 'Compensation', description: 'Payment terms and schedule' },
    { title: 'Term & Termination', description: 'Duration and exit clauses' },
    { title: 'Final Provisions', description: 'Legal jurisdiction and extras' },
]

export default function FreelanceContractForm({ formData, handleChange, acceptees = [] }) {
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
                        <Select
                            label="Select Acceptee (Other Party)"
                            value={formData.accepteeId || ''}
                            onChange={(e) => handleChange('accepteeId', e.target.value)}
                            options={acceptees.map(u => ({ value: u.id, label: `${u.name} (${u.ic})` }))}
                            placeholder="Choose the other party"
                            required
                        />
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
                        <h4 className="font-semibold text-header text-xl mb-4">Step 2: Client Information</h4>
                        <Input
                            label="Who is the one who incharge of hiring the independent contractor? (Enter the full legal name)"
                            value={formData.companyName || ''}
                            onChange={(e) => handleChange('companyName', e.target.value)}
                            placeholder="e.g. John Doe"
                        />
                        <Input
                            label="What is the company name? (Enter the full legal name)"
                            value={formData.companyName || ''}
                            onChange={(e) => handleChange('companyName', e.target.value)}
                            placeholder="e.g. Company Sdn Bhd"
                        />
                        <Input
                            label="What is the Company’s Registration Number? (e.g., SSM number)"
                            value={formData.companyRegNumber || ''}
                            onChange={(e) => handleChange('companyRegNumber', e.target.value)}
                            placeholder="e.g. 202301000000"
                        />
                        <Input
                            label="What is the business address? (Enter street, city, state, and postcode)"
                            value={formData.companyAddress || ''}
                            onChange={(e) => handleChange('companyAddress', e.target.value)}
                            placeholder="Enter full address"
                            icon={MapPin}
                        />
                        <Input
                            label="Who is the authorized signatory? (Enter full name and designation/job title)"
                            value={formData.companySignatory || ''}
                            onChange={(e) => handleChange('companySignatory', e.target.value)}
                            placeholder="e.g. John Doe, Director"
                        />
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 3: Independent Contractor Details</h4>
                        <Input
                            label="What is the contractor’s full legal name?"
                            value={formData.contractorName || ''}
                            onChange={(e) => handleChange('contractorName', e.target.value)}
                            placeholder="Enter full legal name"
                        />
                        <Input
                            label="Identity Verification: Enter NRIC or Passport Number"
                            value={formData.contractorIc || ''}
                            onChange={(e) => handleChange('contractorIc', e.target.value)}
                            placeholder="e.g. 900101-14-1234"
                        />
                        <Input
                            label="What is the contractor's address? (Enter current residential or business address)"
                            value={formData.contractorAddress || ''}
                            onChange={(e) => handleChange('contractorAddress', e.target.value)}
                            placeholder="Enter full address"
                            icon={MapPin}
                        />
                    </div>
                )
            case 3:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 4: Services & Supervision</h4>
                        <Textarea
                            label="Scope of Services: Describe the specific tasks the contractor will perform"
                            value={formData.scopeOfWork || ''}
                            onChange={(e) => handleChange('scopeOfWork', e.target.value)}
                            placeholder="Detailed list of tasks or deliverables"
                            rows={6}
                        />
                        <Input
                            label="Who is the supervisor? (Enter the name of the person or board)"
                            value={formData.supervisorName || ''}
                            onChange={(e) => handleChange('supervisorName', e.target.value)}
                            placeholder="e.g. Project Manager"
                        />
                    </div>
                )
            case 4:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 5: Compensation & Payment</h4>
                        <Input
                            label="What is the payment amount? (MYR)"
                            type="number"
                            value={formData.paymentAmount || ''}
                            onChange={(e) => handleChange('paymentAmount', e.target.value)}
                            placeholder="0.00"
                            icon={DollarSign}
                        />
                        <Select
                            label="How often will this amount be paid?"
                            value={formData.paymentFrequency || ''}
                            onChange={(e) => handleChange('paymentFrequency', e.target.value)}
                            options={[
                                { value: 'per day', label: 'Per Day' },
                                { value: 'per week', label: 'Per Week' },
                                { value: 'per month', label: 'Per Month' },
                                { value: 'upon completion', label: 'Upon Completion' },
                            ]}
                        />
                        <Select
                            label="What is the invoicing frequency?"
                            value={formData.invoicingFrequency || ''}
                            onChange={(e) => handleChange('invoicingFrequency', e.target.value)}
                            options={[
                                { value: 'weekly', label: 'Weekly' },
                                { value: 'biweekly', label: 'Biweekly' },
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'upon completion', label: 'Upon Completion' },
                            ]}
                        />
                        <Input
                            label="Payment Deadline: Within how many business days of receiving an invoice?"
                            type="number"
                            value={formData.paymentDeadlineDays || ''}
                            onChange={(e) => handleChange('paymentDeadlineDays', e.target.value)}
                            placeholder="e.g. 30"
                        />
                    </div>
                )
            case 5:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 6: Term & Termination</h4>
                        <Input
                            label="Effective Date: When should this agreement be dated?"
                            type="date"
                            value={formData.effectiveDate || ''}
                            onChange={(e) => handleChange('effectiveDate', e.target.value)}
                            icon={Calendar}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Start Date"
                                type="date"
                                value={formData.startDate || ''}
                                onChange={(e) => handleChange('startDate', e.target.value)}
                            />
                            <Input
                                label="End Date"
                                type="date"
                                value={formData.endDate || ''}
                                onChange={(e) => handleChange('endDate', e.target.value)}
                            />
                        </div>
                        <Input
                            label="Termination Notice: Days of advance written notice required?"
                            type="number"
                            value={formData.noticePeriodDays || ''}
                            onChange={(e) => handleChange('noticePeriodDays', e.target.value)}
                            placeholder="e.g. 14"
                        />
                    </div>
                )
            case 6:
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-header text-xl mb-4">Step 7: Final Provisions</h4>
                        <Select
                            label="Non-Compete & Non-Solicit Period"
                            value={formData.nonCompeteDuration || '12 months'}
                            onChange={(e) => handleChange('nonCompeteDuration', e.target.value)}
                            options={[
                                { value: '12 months', label: 'Standard (12 months)' },
                                { value: 'custom', label: 'Custom Duration' },
                            ]}
                        />
                        {formData.nonCompeteDuration === 'custom' && (
                            <Input
                                label="Enter Custom Duration"
                                value={formData.customNonCompete || ''}
                                onChange={(e) => handleChange('customNonCompete', e.target.value)}
                                placeholder="e.g. 6 months"
                            />
                        )}
                        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100">
                            <p className="font-semibold mb-1">Jurisdiction</p>
                            <p>This contract will be governed by the laws of Malaysia.</p>
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
                        <h3 className="font-bold text-header text-lg">Freelance Contract</h3>
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
