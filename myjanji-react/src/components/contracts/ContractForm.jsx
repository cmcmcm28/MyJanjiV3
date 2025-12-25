import { useState } from 'react'
import { motion } from 'framer-motion'
import Input, { Textarea, Select } from '../ui/Input'
import Button from '../ui/Button'
import { FileText, DollarSign, Calendar, MapPin, Clock } from 'lucide-react'

import LoanContractForm from './templates/LoanContractForm'
import VehicleLoanContractForm from './templates/VehicleLoanContractForm'
import RentalContractForm from './templates/RentalContractForm'
import ServiceContractForm from './templates/ServiceContractForm'
import FreelanceContractForm from './templates/FreelanceContractForm'
import DepositContractForm from './templates/DepositContractForm'
import CustomContractForm from './templates/CustomContractForm'

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
      {template === 'loan' && <LoanContractForm formData={formData} handleChange={handleChange} />}

      {template === 'vehicle' && <VehicleLoanContractForm formData={formData} handleChange={handleChange} acceptees={acceptees} />}

      {template === 'rental' && <RentalContractForm formData={formData} handleChange={handleChange} />}

      {template === 'service' && <ServiceContractForm formData={formData} handleChange={handleChange} />}

      {template === 'freelance' && <FreelanceContractForm formData={formData} handleChange={handleChange} />}

      {template === 'deposit' && <DepositContractForm formData={formData} handleChange={handleChange} />}

      {template === 'custom' && <CustomContractForm formData={formData} handleChange={handleChange} />}

      {onSubmit && (
        <Button type="submit" fullWidth className="mt-6">
          {submitLabel}
        </Button>
      )}
    </motion.form>
  )
}

