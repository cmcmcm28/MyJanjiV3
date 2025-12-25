// AI Annotation Service
// Communicates with backend to get AI analysis of contracts

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

/**
 * Analyze contract text using AI to extract important clauses
 * @param {string} agreementText - The full contract text to analyze
 * @param {string} contractId - Optional contract ID for reference
 * @returns {Promise<{success: boolean, annotations: Array, error?: string}>}
 */
export const analyzeContract = async (agreementText, contractId = null) => {
    try {
        const response = await fetch(`${BACKEND_URL}/analyze_contract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agreement_text: agreementText,
                contract_id: contractId,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `Server error: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error analyzing contract:', error)
        return {
            success: false,
            error: error.message || 'Failed to analyze contract',
            annotations: [],
        }
    }
}

/**
 * Get agreement text for a contract from the database
 * @param {string} contractId - The contract ID
 * @returns {Promise<{success: boolean, agreement_text: string, error?: string}>}
 */
export const getAgreementText = async (contractId) => {
    try {
        const response = await fetch(`${BACKEND_URL}/get_agreement_text/${contractId}`)

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `Server error: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error getting agreement text:', error)
        return {
            success: false,
            error: error.message || 'Failed to get agreement text',
            agreement_text: '',
        }
    }
}

/**
 * Get color for importance level
 * @param {string} importance - 'high', 'medium', or 'low'
 * @returns {object} Color classes for styling
 */
export const getImportanceColors = (importance) => {
    switch (importance) {
        case 'high':
            return {
                bg: 'bg-red-100',
                border: 'border-red-300',
                text: 'text-red-700',
                dot: 'bg-red-500',
                highlight: 'bg-red-100/70',
            }
        case 'medium':
            return {
                bg: 'bg-orange-100',
                border: 'border-orange-300',
                text: 'text-orange-700',
                dot: 'bg-orange-500',
                highlight: 'bg-orange-100/70',
            }
        case 'low':
            return {
                bg: 'bg-blue-100',
                border: 'border-blue-300',
                text: 'text-blue-700',
                dot: 'bg-blue-500',
                highlight: 'bg-blue-100/70',
            }
        default:
            return {
                bg: 'bg-gray-100',
                border: 'border-gray-300',
                text: 'text-gray-700',
                dot: 'bg-gray-500',
                highlight: 'bg-gray-100/70',
            }
    }
}

/**
 * Get category label and emoji
 * @param {string} category - Category identifier
 * @returns {object} Label and emoji for the category
 */
export const getCategoryInfo = (category) => {
    const categories = {
        payment: { label: 'Payment', emoji: '💰' },
        liability: { label: 'Liability', emoji: '⚖️' },
        termination: { label: 'Termination', emoji: '🚫' },
        penalty: { label: 'Penalty', emoji: '⚠️' },
        obligation: { label: 'Obligation', emoji: '📋' },
        rights: { label: 'Rights', emoji: '✅' },
        confidentiality: { label: 'Confidentiality', emoji: '🔒' },
        dispute: { label: 'Dispute', emoji: '🤝' },
        warranty: { label: 'Warranty', emoji: '🛡️' },
        indemnification: { label: 'Indemnification', emoji: '🔐' },
        renewal: { label: 'Renewal', emoji: '🔄' },
        general: { label: 'General', emoji: '📄' },
    }
    return categories[category] || { label: category, emoji: '📌' }
}

export default {
    analyzeContract,
    getAgreementText,
    getImportanceColors,
    getCategoryInfo,
}
