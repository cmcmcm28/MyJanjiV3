import React from 'react'
import { Textarea } from '../../ui/Input'

export default function CustomContractForm({ formData, handleChange }) {
    return (
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
    )
}
