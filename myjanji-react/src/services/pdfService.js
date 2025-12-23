// PDF Service for contract generation
// Matches the Flutter mock_pdf_service.dart format exactly

import { pdf, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { createElement } from 'react'

// PDF Styles matching Flutter format
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#1565C0',
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
  },
  partiesRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  partyColumn: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  partyText: {
    fontSize: 11,
  },
  paragraph: {
    fontSize: 11,
    textAlign: 'justify',
    marginBottom: 10,
  },
  legalNoticeBox: {
    borderWidth: 1,
    borderColor: '#666666',
    padding: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  legalNoticeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  legalNoticeText: {
    fontSize: 10,
    textAlign: 'justify',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginVertical: 15,
  },
  executionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  signatureColumn: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  signatureBox: {
    width: 100,
    height: 40,
    borderWidth: 1,
    borderColor: '#999999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureImage: {
    width: 100,
    height: 40,
    objectFit: 'contain',
  },
  signaturePlaceholder: {
    fontSize: 8,
    color: '#666666',
    fontStyle: 'italic',
  },
  signatureName: {
    fontSize: 10,
    marginTop: 5,
  },
  signatureIc: {
    fontSize: 9,
  },
  signatureTimestamp: {
    fontSize: 9,
    color: '#666666',
    fontStyle: 'italic',
  },
  contractId: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1565C0',
    marginTop: 20,
  },
})

// Contract template configurations
const contractTemplates = {
  FRIENDLY_LOAN: {
    terms: "The Lender agrees to provide a principal sum of RM{{loanAmount}} to the Borrower for the purpose of {{purpose}}. The Borrower agrees to repay this sum in full on or before {{repaymentDate}}. This loan is provided without interest based on mutual trust.",
    breach: "If the Borrower fails to repay the full outstanding amount by the deadline, the Borrower shall be liable to pay a one-time late penalty of RM50 in addition to the principal sum. The Lender reserves the right to use this signed digital record to pursue debt recovery.",
  },
  BILL_SPLIT: {
    terms: "The Borrower acknowledges a debt of RM{{share}} owed to the Lender, representing their share of the total expense for {{description}} (Total: RM{{total}}) which was paid in advance by the Lender. The Borrower agrees to settle this debt by {{dueDate}}.",
    breach: "Failure by the Borrower to settle this acknowledged debt by the Due Date constitutes a breach of promise. This digital record serves as formal proof of debt for any subsequent recovery action.",
  },
  ITEM_BORROW: {
    terms: "AGREEMENT DATE: {{effectiveDate}}\n\nLOAN PERIOD: {{startDate}} to {{endDate}}\n\nLENDER: {{creatorName}} ({{creatorIdNumber}})\nBORROWER: {{accepteeName}} ({{accepteeIdNumber}})\n\nEQUIPMENT LIST:\n{{equipmentList}}\n\nREPLACEMENT VALUE: RM{{replacementValue}}\n\nPAYMENT TERMS: Rental Fee of RM{{rentalFee}} ({{paymentFrequency}}).",
    breach: "Late Return: A penalty of RM20 per day will be charged. Damage/Loss: If the equipment is lost or damaged, the Borrower agrees to pay the Lender the full Replacement Value of RM{{replacementValue}} within 7 days.",
  },
  VEHICLE_USE: {
    terms: "AGREEMENT DATE: {{effectiveDate}}\n\nLENDING PERIOD: {{startDate}} to {{endDate}}\n\nVEHICLE OWNER: {{creatorName}} ({{creatorIdNumber}})\nBORROWER: {{accepteeName}} ({{accepteeIdNumber}})\n\nVEHICLE DETAILS:\n{{vehicleList}}\n\nREPLACEMENT VALUE: RM{{replacementValue}}\n\nPAYMENT TERMS: Rental Fee of RM{{rentalFee}} ({{paymentFrequency}}).",
    breach: "The Borrower accepts full financial responsibility for traffic summons (SAMAN), fuel costs, and any damages or insurance excesses incurred due to negligence. Loss of vehicle requires payment of Replacement Value (RM{{replacementValue}}) within 14 days.",
  },
  FREELANCE_JOB: {
    terms: "The Client engages the Provider to complete: {{task}}, by {{deadline}}. Total price: RM{{price}}. Deposit received: RM{{deposit}}.",
    breach: "Provider Breach: Failure to deliver allows Client to demand full refund. Client Breach: Failure to pay balance after delivery constitutes a formal debt.",
  },
  SALE_DEPOSIT: {
    terms: "AGREEMENT DATE: {{agreementDate}}\n\nDEPOSITOR: {{depositorName}} ({{depositorNric}})\nRECIPIENT: {{recipientName}} ({{recipientNric}})\n\nTRANSACTION: {{transactionDescription}}\nTOTAL VALUE: RM{{totalTransactionAmount}}\n\nDEPOSIT: RM{{depositAmount}} via {{paymentMethod}} by {{depositDeadline}}.\n\nBALANCE TERMS: {{balancePaymentTerms}}\n\nREFUND POLICY: {{refundStatus}} ({{refundDays}} days if refundable).",
    breach: "Failure to proceed with the transaction according to these terms may result in forfeiture of the deposit or requirement to refund the deposit, subject to the Refund Policy stated above.",
  },
  // Default templates for generic types
  loan: {
    terms: "The Lender agrees to provide a principal sum of RM{{loanAmount}} to the Borrower. The Borrower agrees to repay this sum with {{interestRate}}% interest on or before {{repaymentDate}}.",
    breach: "If the Borrower fails to repay the full outstanding amount by the deadline, the Borrower shall be liable to pay a late penalty. The Lender reserves the right to pursue debt recovery.",
  },
  rental: {
    terms: "The Owner agrees to rent the property at {{propertyAddress}} to the Tenant for RM{{monthlyRent}} per month. A security deposit of RM{{depositAmount}} has been received. The rental period is from {{startDate}} to {{endDate}}.",
    breach: "Late payment of rent will incur a penalty. Any damage to the property beyond normal wear and tear will be deducted from the security deposit.",
  },
  service: {
    terms: "The Provider agrees to deliver the following services: {{serviceDescription}}. Deliverables: {{deliverables}}. Total payment: RM{{paymentAmount}}. Deadline: {{deadline}}.",
    breach: "Provider Breach: Failure to deliver by deadline allows Client to demand refund. Client Breach: Failure to pay upon completion constitutes a formal debt.",
  },
  sale: {
    terms: "The Seller agrees to sell {{itemDescription}} to the Buyer for RM{{salePrice}}. Delivery date: {{deliveryDate}}. Warranty: {{warranty}}.",
    breach: "Seller must deliver item as described. Buyer must complete payment upon delivery. Any breach entitles the other party to seek legal remedy.",
  },
  custom: {
    terms: "{{terms}}",
    breach: "{{conditions}}",
  },
}

// Replace placeholders in text
function replacePlaceholders(text, formData) {
  let result = text
  if (formData) {
    Object.entries(formData).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value?.toString() || '')
    })
  }
  // Remove any remaining placeholders
  result = result.replace(/{{[^}]+}}/g, '[Not specified]')
  return result
}

// Format date for display
function formatDate(date) {
  if (!date) return '[Date]'
  const d = new Date(date)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function formatDateTime(date) {
  if (!date) return '[Pending]'
  const d = new Date(date)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// Contract PDF Document Component
function ContractDocument({
  contract,
  creator,
  acceptee,
  templateType = 'custom',
  formData = {},
  includeSignatures = true,
}) {
  // Get template or use defaults
  const template = contractTemplates[templateType?.toUpperCase()] ||
    contractTemplates[templateType] ||
    contractTemplates.custom

  // Build form data for placeholder replacement
  const allFormData = {
    ...formData,
    item: contract?.name || formData?.item || '[Item]',
    returnDate: formatDate(contract?.dueDate || formData?.returnDate),
    dueDate: formatDate(contract?.dueDate || formData?.dueDate),
    repaymentDate: formatDate(formData?.repaymentDate || contract?.dueDate),
    deadline: formatDate(formData?.deadline || contract?.dueDate),
    startDate: formatDate(formData?.startDate),
    endDate: formatDate(formData?.endDate || contract?.dueDate),
    deliveryDate: formatDate(formData?.deliveryDate),
    condition: formData?.condition || 'Brand New',
    value: formData?.value || formData?.salePrice || '5000',
  }

  const termsText = replacePlaceholders(template.terms, allFormData)
  const breachText = replacePlaceholders(template.breach, allFormData)
  const contractId = contract?.id || `CNT-${Date.now().toString().slice(-6)}`

  return createElement(Document, null,
    createElement(Page, { size: 'A4', style: styles.page },
      // Header: PERJANJIAN DIGITAL
      createElement(View, { style: styles.header },
        createElement(Text, { style: styles.headerTitle }, 'PERJANJIAN DIGITAL')
      ),

      // PARTIES TO THIS AGREEMENT
      createElement(Text, { style: styles.sectionTitle }, 'PARTIES TO THIS AGREEMENT'),
      createElement(View, { style: styles.partiesRow },
        // Lender/Owner/Seller/Client
        createElement(View, { style: styles.partyColumn },
          createElement(Text, { style: styles.partyLabel }, 'LENDER/OWNER/SELLER/CLIENT:'),
          createElement(Text, { style: styles.partyText }, `Name: ${creator?.name || 'SpongeBob bin Squarepants'}`),
          createElement(Text, { style: styles.partyText }, `IC: ${creator?.ic || '123456-12-1234'}`)
        ),
        // Borrower/Buyer/Provider
        createElement(View, { style: styles.partyColumn },
          createElement(Text, { style: styles.partyLabel }, 'BORROWER/BUYER/PROVIDER:'),
          createElement(Text, { style: styles.partyText }, `Name: ${acceptee?.name || ''}`),
          createElement(Text, { style: styles.partyText }, `IC: ${acceptee?.ic || ''}`)
        )
      ),

      // TERMS AND CONDITIONS
      createElement(Text, { style: styles.sectionTitle }, 'TERMS AND CONDITIONS'),
      createElement(Text, { style: styles.paragraph }, termsText),

      // BREACH OF AGREEMENT
      createElement(Text, { style: styles.sectionTitle }, 'BREACH OF AGREEMENT'),
      createElement(Text, { style: styles.paragraph }, breachText),

      // LEGAL NOTICE Box
      createElement(View, { style: styles.legalNoticeBox },
        createElement(Text, { style: styles.legalNoticeTitle }, 'LEGAL NOTICE'),
        createElement(Text, { style: styles.legalNoticeText },
          'This digital contract is executed in accordance with the Electronic Commerce Act 2006 (Act 658) of Malaysia. ' +
          'The digital signatures affixed to this document are legally binding and equivalent to handwritten signatures. ' +
          'This document has been timestamped and cryptographically secured. Any tampering with this document will be ' +
          'detectable and may result in legal consequences.'
        )
      ),

      // Divider
      createElement(View, { style: styles.divider }),

      // EXECUTION RECORD
      createElement(Text, { style: styles.executionTitle }, 'EXECUTION RECORD'),
      createElement(View, { style: styles.signaturesRow },
        // Lender Signature
        createElement(View, { style: styles.signatureColumn },
          createElement(Text, { style: styles.signatureLabel }, 'Lender Signature:'),
          contract?.creatorSignature
            ? createElement(Image, { src: contract.creatorSignature, style: styles.signatureImage })
            : createElement(View, { style: styles.signatureBox },
              createElement(Text, { style: styles.signaturePlaceholder }, '[Pending Signature]')
            ),
          createElement(Text, { style: styles.signatureName }, creator?.name || 'SpongeBob bin Squarepants'),
          createElement(Text, { style: styles.signatureIc }, `IC: ${creator?.ic || '123456-12-1234'}`),
          createElement(Text, { style: styles.signatureTimestamp },
            contract?.creatorSignature
              ? `Signed: ${formatDateTime(contract?.signatureDate)}`
              : 'Signed: [Pending]'
          )
        ),
        // Borrower Signature
        createElement(View, { style: styles.signatureColumn },
          createElement(Text, { style: styles.signatureLabel }, 'Borrower Signature:'),
          contract?.accepteeSignature
            ? createElement(Image, { src: contract.accepteeSignature, style: styles.signatureImage })
            : createElement(View, { style: styles.signatureBox },
              createElement(Text, { style: styles.signaturePlaceholder }, '[Pending Signature]')
            ),
          createElement(Text, { style: styles.signatureName }, acceptee?.name || ''),
          createElement(Text, { style: styles.signatureIc }, acceptee?.ic ? `IC: ${acceptee.ic}` : 'IC:'),
          createElement(Text, { style: styles.signatureTimestamp },
            contract?.accepteeSignature
              ? `Signed: ${formatDateTime(new Date())}`
              : 'Signed: [Pending]'
          )
        )
      ),

      // Contract ID
      createElement(Text, { style: styles.contractId }, `Contract ID: ${contractId}`)
    )
  )
}

export const pdfService = {
  // Generate PDF blob from contract
  async generateContractPDF(contract, creator, acceptee, options = {}) {
    try {
      const doc = createElement(ContractDocument, {
        contract,
        creator,
        acceptee,
        templateType: contract?.templateType || options.templateType || 'custom',
        formData: contract?.formData || options.formData || {},
        includeSignatures: options.includeSignatures !== false,
      })
      const blob = await pdf(doc).toBlob()
      return {
        success: true,
        blob,
        url: URL.createObjectURL(blob),
      }
    } catch (error) {
      console.error('PDF generation error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  },

  // Generate PDF with specific template
  async generateTemplatedPDF(templateType, formData, options = {}) {
    const mockContract = {
      id: options.contractId || `CNT-${Date.now().toString().slice(-6)}`,
      name: formData.item || formData.name || 'Contract',
      dueDate: formData.dueDate || formData.returnDate || new Date(),
      templateType,
      formData,
      creatorSignature: options.creatorSignature || null,
      accepteeSignature: options.accepteeSignature || null,
      signatureDate: options.signatureDate || new Date(),
    }

    return this.generateContractPDF(
      mockContract,
      options.creator || { name: 'SpongeBob bin Squarepants', ic: '123456-12-1234' },
      options.acceptee || { name: '', ic: '' },
      { templateType, formData, includeSignatures: options.includeSignatures }
    )
  },

  // Download PDF
  async downloadContractPDF(contract, creator, acceptee, options = {}) {
    const result = await this.generateContractPDF(contract, creator, acceptee, options)
    if (result.success) {
      const link = document.createElement('a')
      link.href = result.url
      const contractName = contract?.name?.replace(/\s+/g, '_') || 'Contract'
      link.download = `${contract?.id || 'CNT'}-${contractName}.pdf`
      link.click()
      URL.revokeObjectURL(result.url)
      return { success: true }
    }
    return result
  },

  // Open PDF in new tab
  async viewContractPDF(contract, creator, acceptee, options = {}) {
    const result = await this.generateContractPDF(contract, creator, acceptee, options)
    if (result.success) {
      window.open(result.url, '_blank')
      return { success: true }
    }
    return result
  },
}

export default pdfService
