import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ContractProvider } from './context/ContractContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CreateContractPage from './pages/CreateContractPage'
import ContractCreatedPage from './pages/ContractCreatedPage'
import SignContractPage from './pages/SignContractPage'
import FaceVerificationPage from './pages/FaceVerificationPage'
import BiometricLoginPage from './pages/BiometricLoginPage'
import ContractsPage from './pages/ContractsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import EnforcementPage from './pages/EnforcementPage'

function App() {
  return (
    <AuthProvider>
      <ContractProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/biometric-login" element={<BiometricLoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/enforcement" element={<EnforcementPage />} />
          <Route path="/create-contract" element={<CreateContractPage />} />
          <Route path="/contract-created" element={<ContractCreatedPage />} />
          <Route path="/sign-contract/:contractId" element={<SignContractPage />} />
          <Route path="/face-verification" element={<FaceVerificationPage />} />
        </Routes>
      </ContractProvider>
    </AuthProvider>
  )
}

export default App
