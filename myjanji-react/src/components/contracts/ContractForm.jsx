import { useState } from 'react'
import { motion } from 'framer-motion'
import Input, { Textarea, Select } from '../ui/Input'
import Button from '../ui/Button'
import { FileText, DollarSign, Calendar, MapPin, Clock } from 'lucide-react'

export default function ContractForm({
  template,
  formData,
  onChange,
  acceptees = [],
  onSubmit,
  submitLabel = 'Continue',
}) {
  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value })
  }

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
    >
      {/* Common Fields */}
      <Input
        label="Contract Name"
        value={formData.name || ''}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder="Enter contract name"
        icon={FileText}
        required
      />

      <Input
        label="Topic / Description"
        value={formData.topic || ''}
        onChange={(e) => handleChange('topic', e.target.value)}
        placeholder="Brief description"
      />

      <Select
        label="Select Acceptee"
        value={formData.accepteeId || ''}
        onChange={(e) => handleChange('accepteeId', e.target.value)}
        options={acceptees.map((u) => ({
          value: u.id,
          label: `${u.name} (${u.ic})`,
        }))}
        placeholder="Choose the other party"
        required
      />

      <Input
        label="Due Date"
        type="date"
        value={formData.dueDate || ''}
        onChange={(e) => handleChange('dueDate', e.target.value)}
        icon={Calendar}
        required
      />

      {/* Template-specific fields */}
      {template === 'loan' && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h4 className="font-semibold text-header">Loan Details</h4>
          <Input
            label="Loan Amount (RM)"
            type="number"
            value={formData.loanAmount || ''}
            onChange={(e) => handleChange('loanAmount', e.target.value)}
            placeholder="0.00"
            icon={DollarSign}
          />
          <Input
            label="Interest Rate (%)"
            type="number"
            value={formData.interestRate || ''}
            onChange={(e) => handleChange('interestRate', e.target.value)}
            placeholder="0"
          />
          <Input
            label="Repayment Date"
            type="date"
            value={formData.repaymentDate || ''}
            onChange={(e) => handleChange('repaymentDate', e.target.value)}
          />
        </div>
      )}

      {template === 'rental' && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h4 className="font-semibold text-header">Rental Details</h4>
          <Input
            label="Property Address"
            value={formData.propertyAddress || ''}
            onChange={(e) => handleChange('propertyAddress', e.target.value)}
            placeholder="Enter address"
            icon={MapPin}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monthly Rent (RM)"
              type="number"
              value={formData.monthlyRent || ''}
              onChange={(e) => handleChange('monthlyRent', e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Deposit (RM)"
              type="number"
              value={formData.depositAmount || ''}
              onChange={(e) => handleChange('depositAmount', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      )}

      {template === 'service' && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h4 className="font-semibold text-header">Service Details</h4>
          <Textarea
            label="Service Description"
            value={formData.serviceDescription || ''}
            onChange={(e) => handleChange('serviceDescription', e.target.value)}
            placeholder="Describe services"
            rows={3}
          />
          <Input
            label="Payment Amount (RM)"
            type="number"
            value={formData.paymentAmount || ''}
            onChange={(e) => handleChange('paymentAmount', e.target.value)}
            placeholder="0.00"
            icon={DollarSign}
          />
          <Input
            label="Deadline"
            type="date"
            value={formData.deadline || ''}
            onChange={(e) => handleChange('deadline', e.target.value)}
            icon={Clock}
          />
        </div>
      )}

      {template === 'custom' && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h4 className="font-semibold text-header">Custom Terms</h4>
          <Textarea
            label="Terms"
            value={formData.terms || ''}
            onChange={(e) => handleChange('terms', e.target.value)}
            placeholder="Define contract terms"
            rows={4}
          />
          <Textarea
            label="Conditions"
            value={formData.conditions || ''}
            onChange={(e) => handleChange('conditions', e.target.value)}
            placeholder="Specify conditions"
            rows={4}
          />
        </div>
      )}

      {onSubmit && (
        <Button type="submit" fullWidth className="mt-6">
          {submitLabel}
        </Button>
      )}
    </motion.form>
  )
}

