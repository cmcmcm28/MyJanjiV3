import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { motion } from 'framer-motion'
import { Eraser, Check, RotateCcw } from 'lucide-react'
import Button from '../ui/Button'

export default function SignaturePad({ onSave, onCancel, width = 400, height = 200 }) {
  const sigCanvas = useRef(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width, height })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        setDimensions({
          width: Math.min(containerWidth - 20, width),
          height: height,
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [width, height])

  const handleClear = () => {
    sigCanvas.current?.clear()
    setIsEmpty(true)
  }

  const handleSave = () => {
    if (sigCanvas.current && !isEmpty) {
      const dataUrl = sigCanvas.current.toDataURL('image/png')
      onSave(dataUrl)
    }
  }

  const handleBegin = () => {
    setIsEmpty(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center"
      ref={containerRef}
    >
      <p className="text-sm text-body/60 mb-3">Sign in the box below</p>
      
      <div className="border-2 border-dashed border-primary/30 rounded-xl p-2 bg-white">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="#1A237E"
          canvasProps={{
            width: dimensions.width,
            height: dimensions.height,
            className: 'signature-canvas rounded-lg',
            style: {
              background: '#FAFAFA',
              borderRadius: '8px',
            }
          }}
          onBegin={handleBegin}
        />
      </div>

      <div className="flex items-center gap-3 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          icon={RotateCcw}
        >
          Clear
        </Button>
        
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={isEmpty}
          icon={Check}
        >
          Save Signature
        </Button>
      </div>

      <p className="text-xs text-body/40 mt-3">
        Your signature will be securely stored
      </p>
    </motion.div>
  )
}

