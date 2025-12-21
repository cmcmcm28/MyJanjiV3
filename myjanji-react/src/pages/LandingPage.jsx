import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UserPlus,
  LogIn,
  CreditCard,
  ScanFace,
  Shield,
  CheckCircle,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen gradient-background flex flex-col">
      {/* Header/Logo Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-10 pb-6 px-4"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src="/images/myjanji_logov2.png"
            alt="MyJanji Logo"
            className="h-12 w-auto object-contain"
          />
          <h1 className="text-3xl font-bold text-header">MyJanji</h1>
        </div>
        <p className="text-body/60 text-sm">Digital Contract Management Platform</p>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md"
        >
          <Card padding="lg" className="text-center">
            <h2 className="text-2xl font-bold text-header mb-2">
              Welcome to MyJanji
            </h2>
            <p className="text-body/60 text-sm mb-8">
              Create and manage digital contracts with secure identity verification
            </p>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-body/60 mt-1">IC Verification</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <ScanFace className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-body/60 mt-1">Face Recognition</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-body/60 mt-1">Secure Signing</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                fullWidth
                size="lg"
                onClick={() => navigate('/register')}
                icon={UserPlus}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                Create New Account
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
            <p className="text-xs text-body/40 mt-6">
              New to MyJanji? Register with your MyKad and face verification
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

