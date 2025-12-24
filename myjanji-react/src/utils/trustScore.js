/**
 * Trust Score Utility
 * Calculates user trust score based on contract history
 * Score: 0-5 with 2 decimal places
 * Colors: 0-1.99 (red), 2-3.99 (yellow), 4-5 (green)
 */

/**
 * Calculate trust score based on contract statistics
 * @param {Object} stats - { completed, expired, breached, total }
 * @returns {number} Trust score from 0 to 5
 */
export function calculateTrustScore(stats) {
    const { completed = 0, expired = 0, breached = 0, total = 0, pending = 0, ongoing = 0 } = stats

    // If no contracts yet, return base score of 3.00 (neutral)
    if (total === 0) {
        return 3.00
    }

    // Base score starts at 3.00 (neutral)
    let score = 3.00

    // Positive: Completed contracts boost score
    // Each completed contract adds up to +0.3, diminishing returns
    const completedBonus = Math.min(completed * 0.3, 2.0)
    score += completedBonus

    // Negative: Expired contracts reduce score slightly
    // Each expired contract reduces by 0.2
    const expiredPenalty = expired * 0.2
    score -= expiredPenalty

    // Negative: Breached contracts severely reduce score
    // Each breached contract reduces by 0.5
    const breachedPenalty = breached * 0.5
    score -= breachedPenalty

    // Clamp score between 0 and 5
    score = Math.max(0, Math.min(5, score))

    // Round to 2 decimal places
    return Math.round(score * 100) / 100
}

/**
 * Get the color class for a trust score
 * @param {number} score - Trust score (0-5)
 * @returns {Object} { bg, text, border, label }
 */
export function getTrustScoreColor(score) {
    if (score < 2) {
        return {
            bg: 'bg-red-100',
            text: 'text-red-600',
            border: 'border-red-200',
            label: 'Low Trust',
            gradient: 'from-red-500 to-red-600',
        }
    } else if (score < 4) {
        return {
            bg: 'bg-yellow-100',
            text: 'text-yellow-600',
            border: 'border-yellow-200',
            label: 'Medium Trust',
            gradient: 'from-yellow-500 to-orange-500',
        }
    } else {
        return {
            bg: 'bg-green-100',
            text: 'text-green-600',
            border: 'border-green-200',
            label: 'High Trust',
            gradient: 'from-green-500 to-emerald-500',
        }
    }
}

/**
 * Get trust score stats from contracts array
 * @param {Array} contracts - User's contracts
 * @param {string} userId - User ID to check
 * @returns {Object} Stats object
 */
export function getContractStats(contracts, userId) {
    if (!contracts || !userId) {
        return { completed: 0, expired: 0, breached: 0, total: 0, ongoing: 0, pending: 0 }
    }

    // Filter contracts where user is creator or acceptee
    const userContracts = contracts.filter(c =>
        c.userId === userId || c.accepteeId === userId
    )

    return {
        total: userContracts.length,
        completed: userContracts.filter(c => c.status === 'Completed').length,
        expired: userContracts.filter(c => c.status === 'Expired').length,
        breached: userContracts.filter(c => c.status === 'Breached').length,
        ongoing: userContracts.filter(c => c.status === 'Ongoing' || c.status === 'Active').length,
        pending: userContracts.filter(c => c.status === 'Pending').length,
    }
}

/**
 * Format trust score for display
 * @param {number} score - Trust score
 * @returns {string} Formatted score like "4.25"
 */
export function formatTrustScore(score) {
    return score.toFixed(2)
}
