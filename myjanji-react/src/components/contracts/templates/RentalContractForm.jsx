import React from 'react'
import Input from '../../ui/Input'
import { MapPin } from 'lucide-react'

export default function RentalContractForm({ formData, handleChange }) {
    return (
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
    )
}
