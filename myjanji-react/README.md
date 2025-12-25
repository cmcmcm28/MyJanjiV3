# MyJanji React - Digital Contract Management Platform

A modern React + Vite conversion of the Flutter MyJanji application for managing digital contracts with biometric authentication.

## 🚀 Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS v4
- **State Management**: React Context API
- **Routing**: React Router v6
- **Animations**: Framer Motion
- **PDF Generation**: @react-pdf/renderer
- **QR Codes**: qrcode.react
- **Camera/Webcam**: react-webcam
- **Signature Capture**: react-signature-canvas
- **Icons**: Lucide React
- **Fonts**: Poppins (Google Fonts)

## 📁 Project Structure

```
myjanji-react/
├── src/
│   ├── main.jsx              # App entry point
│   ├── App.jsx               # Root component with routes
│   ├── index.css             # Global styles & Tailwind config
│   ├── context/
│   │   ├── AuthContext.jsx   # Authentication state
│   │   └── ContractContext.jsx # Contract management
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── CreateContractPage.jsx
│   │   ├── SignContractPage.jsx
│   │   ├── FaceVerificationPage.jsx
│   │   └── BiometricLoginPage.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   └── BottomNav.jsx
│   │   ├── contracts/
│   │   │   ├── ContractCard.jsx
│   │   │   ├── ContractList.jsx
│   │   │   └── ContractForm.jsx
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   └── Modal.jsx
│   │   └── features/
│   │       ├── SignaturePad.jsx
│   │       ├── QRCodeDisplay.jsx
│   │       └── WebcamCapture.jsx
│   ├── services/
│   │   ├── faceAuthService.js
│   │   └── pdfService.js
│   └── utils/
│       └── dummyData.js
└── public/
    └── images/
```

## 🎨 Features

### Authentication
- **IC Card Login**: Select user from available demo accounts
- **Face Recognition**: Webcam-based face verification
- **Biometric Login**: Face or fingerprint authentication options

### Contract Management
- **Dashboard**: View all contracts with filtering by status
- **Create Contract**: Multi-step wizard with template selection
- **Sign Contract**: Face verification + digital signature
- **PDF Generation**: Download contracts as PDF documents
- **QR Codes**: Share contracts via QR codes

### UI/UX
- Modern, clean design matching the Flutter app's aesthetics
- Smooth animations with Framer Motion
- Responsive layout for mobile and desktop
- Gradient themes and card-based design

## 🏃 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Navigate to the project
cd myjanji-react

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## 🔗 Backend Integration

The face recognition feature connects to the existing Python Flask backend:

```
Face recognition/app.py
```

Start the Flask server:
```bash
cd "Face recognition"
pip install -r requirements.txt
python app.py
```

The Flask server runs on `http://localhost:5000`

## 📱 Demo Users

| User | IC Number | Role |
|------|-----------|------|
| SpongeBob SquarePants | 901212-10-5599 | Contract Creator |
| Ultraman Taro | 850505-14-3344 | Contract Acceptee |

## 🎯 Key Routes

| Route | Description |
|-------|-------------|
| `/login` | IC Card login page |
| `/biometric-login` | Face/Fingerprint login |
| `/dashboard` | Main dashboard with contracts |
| `/create-contract` | Create new contract wizard |
| `/sign-contract/:id` | Sign a pending contract |
| `/face-verification` | Face verification page |

## 🛠️ Development

### Linting
```bash
npm run lint
```

### Preview Production Build
```bash
npm run preview
```

## 📄 License

This project is for demonstration purposes.

---

Built with ❤️ using React + Vite + Tailwind CSS
