import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import { Download, Share2 } from 'lucide-react'
import Button from '../ui/Button'

export default function QRCodeDisplay({
  value,
  size = 200,
  title = 'Contract QR Code',
  description = 'Scan to view contract details',
  showActions = true,
}) {
  const handleDownload = () => {
    const svg = document.getElementById('contract-qr-code')
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        canvas.width = size
        canvas.height = size
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        
        const pngUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = `contract-qr-${Date.now()}.png`
        link.href = pngUrl
        link.click()
      }
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Contract QR Code',
          text: `Contract: ${value}`,
          url: window.location.href,
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center p-6 bg-white rounded-2xl card-shadow"
    >
      {title && (
        <h3 className="text-lg font-semibold text-header mb-1">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-body/60 mb-4">{description}</p>
      )}
      
      <div className="p-4 bg-white rounded-xl border border-gray-100">
        <QRCodeSVG
          id="contract-qr-code"
          value={value}
          size={size}
          level="H"
          includeMargin
          fgColor="#1A237E"
          bgColor="#FFFFFF"
        />
      </div>

      <p className="text-xs text-body/40 mt-3 font-mono">{value}</p>

      {showActions && (
        <div className="flex items-center gap-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            icon={Download}
          >
            Download
          </Button>
          {navigator.share && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              icon={Share2}
            >
              Share
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}

