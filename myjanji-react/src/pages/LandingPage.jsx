import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UserPlus,
  LogIn,
  CreditCard,
  ScanFace,
  FileSignature,
  Shield,
  FileCheck,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen gradient-background flex flex-col">
      {/* Header/Logo Section - Centered vertically at top */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-12 pb-6 px-4"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <img
            src="/images/myjanji_logov2.png"
            alt="MyJanji Logo"
            className="h-12 w-auto object-contain"
          />
          <h1 className="text-3xl font-bold text-primary-dark">MyJanji</h1>
        </div>
        <p className="text-primary-mid text-sm font-medium">Digital Contract Management Platform</p>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-between px-4 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md mx-auto"
        >
          <Card padding="lg" className="text-center">
            <h2 className="text-2xl font-bold text-header mb-3">
              Welcome to MyJanji
            </h2>
            <p className="text-body/60 text-sm mb-8 leading-relaxed">
              Draft and sign legally binding agreements<br />
              instantly using MyKad
            </p>

            {/* Features - 3 columns with hover labels */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <div className="relative group">
                <div className="w-14 h-14 rounded-2xl icon-container flex items-center justify-center transition-transform duration-300 hover:scale-110 cursor-pointer">
                  <CreditCard className="h-6 w-6 text-primary-mid" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap bg-gray-800 text-white text-xs py-1 px-2 rounded pointer-events-none">
                  MyKad Verification
                </div>
              </div>
              <div className="relative group">
                <div className="w-14 h-14 rounded-2xl icon-container flex items-center justify-center transition-transform duration-300 hover:scale-110 cursor-pointer">
                  <ScanFace className="h-6 w-6 text-primary-mid" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap bg-gray-800 text-white text-xs py-1 px-2 rounded pointer-events-none">
                  Face Recognition
                </div>
              </div>
              <div className="relative group">
                <div className="w-14 h-14 rounded-2xl icon-container flex items-center justify-center transition-transform duration-300 hover:scale-110 cursor-pointer">
                  <FileSignature className="h-6 w-6 text-primary-mid" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap bg-gray-800 text-white text-xs py-1 px-2 rounded pointer-events-none">
                  Secure Signing
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                fullWidth
                size="lg"
                onClick={() => navigate('/register')}
                icon={UserPlus}
              >
                Register with MyKad
              </Button>
              
              <Button
                fullWidth
                size="lg"
                variant="outline"
                onClick={() => navigate('/login')}
                icon={LogIn}
              >
                Sign In
              </Button>
            </div>

            {/* Info Text */}
            <p className="text-xs text-body/50 mt-6 leading-relaxed">
              Compliant with <br /><span className="text-primary-mid font-medium">Digital Signature Act 1977</span> & <span className="text-primary-mid font-medium">e-KYC Standards</span>
            </p>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-6 mt-6 pt-4"
        >
          <div className="flex items-center gap-2 text-body/50">
            <Shield className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-xs font-medium">Bank-grade security</span>
          </div>
          <div className="flex items-center gap-2 text-body/50">
            <FileCheck className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-xs font-medium">Legally binding</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

