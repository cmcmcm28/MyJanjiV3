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

  // Legacy methods for compatibility
  async registerFace(userId, imageData) {
    return this.uploadIC(imageData)
  },

  async verifyFace(userId, imageData) {
    return this.verifyFrame(imageData)
  },
}

export default faceAuthService
