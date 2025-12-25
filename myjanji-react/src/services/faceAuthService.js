// Face Authentication Service
// Connects to the Python Flask backend for face recognition

const API_BASE_URL = 'http://localhost:5000'

export const faceAuthService = {
  // Check if backend is running
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      const data = await response.json()
      return {
        isOnline: data.status === 'ok',
        message: data.message,
      }
    } catch (error) {
      return {
        isOnline: false,
        message: 'Backend server is not running',
      }
    }
  },

  // Upload IC image to register face
  async uploadIC(imageFile) {
    try {
      const formData = new FormData()

      // If it's a base64 string, convert to blob
      if (typeof imageFile === 'string' && imageFile.startsWith('data:')) {
        const response = await fetch(imageFile)
        const blob = await response.blob()
        formData.append('ic_image', blob, 'ic_photo.jpg')
      } else if (imageFile instanceof File) {
        formData.append('ic_image', imageFile)
      } else if (imageFile instanceof Blob) {
        formData.append('ic_image', imageFile, 'ic_photo.jpg')
      }

      const response = await fetch(`${API_BASE_URL}/upload_ic`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      return {
        success: data.status === 'success',
        message: data.message || (data.status === 'success' ? 'IC uploaded successfully' : 'Upload failed'),
        ocrData: data.ocr_data || null, // Include OCR extracted data
        faceEmbedding: data.face_embedding || null, // Include face embedding
        data,
      }
    } catch (error) {
      console.error('IC upload error:', error)
      return {
        success: false,
        message: 'Failed to connect to face recognition server. Make sure the Python backend is running.',
        error: error.message,
      }
    }
  },

  // Extract IC details using OCR (dedicated endpoint)
  async extractICDetails(imageFile) {
    try {
      console.log('🔍 extractICDetails called with:', typeof imageFile)
      const formData = new FormData()

      // If it's a base64 string, convert to blob
      if (typeof imageFile === 'string' && imageFile.startsWith('data:')) {
        const response = await fetch(imageFile)
        const blob = await response.blob()
        formData.append('ic_image', blob, 'ic_photo.jpg')
        console.log('📤 Converted base64 to blob')
      } else if (imageFile instanceof File) {
        formData.append('ic_image', imageFile)
        console.log('📤 Using File object:', imageFile.name)
      } else if (imageFile instanceof Blob) {
        formData.append('ic_image', imageFile, 'ic_photo.jpg')
        console.log('📤 Using Blob object')
      } else {
        console.error('❌ Unknown imageFile type:', typeof imageFile)
        return {
          success: false,
          error: 'Invalid image file type',
        }
      }

      console.log('📡 Sending request to /extract_ic...')
      const response = await fetch(`${API_BASE_URL}/extract_ic`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error response:', errorText)
        return {
          success: false,
          error: `Server error: ${response.status}`,
        }
      }

      const data = await response.json()
      console.log('📥 Received OCR response:', data)

      return {
        success: data.status === 'success',
        data: data.data || null,
        error: data.message || (data.data?.error) || null,
      }
    } catch (error) {
      console.error('❌ IC extraction error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  },

  // Verify face by sending a webcam frame
  async verifyFrame(imageData) {
    try {
      // Remove data URL prefix if present
      let base64Image = imageData
      if (imageData.includes(',')) {
        base64Image = imageData.split(',')[1]
      }

      const response = await fetch(`${API_BASE_URL}/process_frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
      })

      const data = await response.json()

      return {
        success: data.status === 'success',
        status: data.status,
        score: data.score,
        message: data.message,
        noFace: data.message === 'No face detected',
        data,
      }
    } catch (error) {
      console.error('Frame verification error:', error)
      return {
        success: false,
        status: 'error',
        message: 'Failed to verify face. Check server connection.',
        error: error.message,
      }
    }
  },

  // Verify face for login using stored embedding from Supabase
  async verifyLogin(imageData, storedEmbedding) {
    try {
      let base64Image = imageData
      if (imageData.includes(',')) {
        base64Image = imageData.split(',')[1]
      }

      const response = await fetch(`${API_BASE_URL}/verify_login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          face_embedding: storedEmbedding,
        }),
      })

      const data = await response.json()

      return {
        success: data.status === 'success',
        status: data.status,
        score: data.score,
        message: data.message,
        noFace: data.message === 'No face detected',
        data,
      }
    } catch (error) {
      console.error('Login verification error:', error)
      return {
        success: false,
        status: 'error',
        message: 'Failed to verify face. Check server connection.',
        error: error.message,
      }
    }
  },

  /**
   * Identify user from face in a SINGLE API call.
   * Backend compares against all users with face embeddings.
   * Returns the matched user or error.
   * 
   * This is 5-10x faster than the old method that looped through users.
   */
  async identifyFace(imageData) {
    try {
      const response = await fetch(`${API_BASE_URL}/identify_face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      })

      const data = await response.json()

      return {
        success: data.success,
        user: data.user || null,
        score: data.score || 0,
        message: data.message,
        bestScore: data.best_score || 0,
      }
    } catch (error) {
      console.error('Face identification error:', error)
      return {
        success: false,
        user: null,
        message: 'Failed to identify face. Check server connection.',
        error: error.message,
      }
    }
  },

  // Legacy methods for compatibility
  async registerFace(userId, imageData) {
    return this.uploadIC(imageData)
  },

  async verifyFace(userId, imageData) {
    return this.verifyFrame(imageData)
  },
}

export default faceAuthService
