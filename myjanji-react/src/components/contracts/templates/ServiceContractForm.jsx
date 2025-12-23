import React from 'react'
import Input, { Textarea } from '../../ui/Input'
import { DollarSign, Clock } from 'lucide-react'

export default function ServiceContractForm({ formData, handleChange }) {
    return (
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
    )
}
