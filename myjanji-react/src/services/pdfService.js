// PDF Service for contract generation
// Matches the Flutter mock_pdf_service.dart format exactly

// We are switching to Backend Generation for accurate DOCX -> PDF conversion
const API_URL = 'http://localhost:5000';

export const pdfService = {
  // Generate PDF via Backend API
  async generateContractPDF(contract, creator, acceptee, options = {}) {
    try {
      console.log('Generating PDF via backend...');

      const payload = {
        template_name: contract?.templateType || options.templateType,
        placeholders: {
          ...contract?.formData,
          ...options.formData,
          // Add standard fields that backend expects but might be missing in formData
          creator_name: creator?.name,
          creator_id_number: creator?.ic,
          acceptee_name: acceptee?.name,
          acceptee_id_number: acceptee?.ic,
          signing_date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
        },
        contract_id: contract?.id || options.contractId || `CNT-${Date.now()}`
      };

      // Map specific fields if needed (e.g. if frontend uses 'item' but backend needs 'model')
      // Our backend now handles mapping via templates_config.json, so we just send raw keys.

      const response = await fetch(`${API_URL}/generate_contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === 'success') {
        console.log('PDF Generated:', data.pdf_url);
        return {
          success: true,
          url: data.pdf_url,
          // blob: null // We don't have a blob anymore, but url should be enough for basic usage
        };
      } else {
        throw new Error(data.message || 'Unknown error from backend');
      }

    } catch (error) {
      console.error('Backend PDF generation error:', error);
      // Fallback or error
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Generate PDF with specific template (Mock wrapper for backend)
  async generateTemplatedPDF(templateType, formData, options = {}) {
    // Re-route to main function
    const mockContract = {
      id: options.contractId,
      templateType,
      formData
    };
    return this.generateContractPDF(mockContract, options.creator, options.acceptee, options);
  },

  // Download PDF
  async downloadContractPDF(contract, creator, acceptee, options = {}) {
    const result = await this.generateContractPDF(contract, creator, acceptee, options)
    if (result.success) {
      // For remote URLs, we open in new tab as download might be blocked by CORS
      window.open(result.url, '_blank');
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
