   # MyJanji V3 - React Version

This is the React.js version of the MyJanji digital contract management platform, separated from the Flutter/Dart implementation.

## Project Structure

```
MyJanji V3/
├── myjanji-react/          # React frontend application
│   ├── src/                # Source code
│   ├── public/             # Static assets
│   └── package.json        # Dependencies
├── assets/                 # Shared assets (images, etc.)
│   └── images/             # Logo and user avatars
└── backend/                # Python Flask backend for face recognition
    ├── app.py              # Main Flask application
    ├── requirements.txt    # Python dependencies
    └── uploads/            # Temporary upload storage
```

## Getting Started

### Frontend (React)

1. Navigate to the React project:
   ```bash
   cd myjanji-react
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

### Backend (Face Recognition)

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the Flask server:
   ```bash
   python app.py
   ```

The backend will run on `http://localhost:5000` by default.

## Features

- **Digital Contract Management**: Create, sign, and manage contracts
- **Face Recognition**: Biometric authentication using DeepFace
- **NFC Scanning**: MyKad chip verification (mocked for demo)
- **PDF Generation**: Generate signed contract PDFs
- **Multi-step Verification**: IC upload → NFC scan → Face verification → Signature

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion
- **Backend**: Python Flask, DeepFace, PostgreSQL
- **PDF**: @react-pdf/renderer
- **Icons**: Lucide React

## Notes

- This version is separated from the Flutter/Dart implementation
- All React-specific code is in `myjanji-react/`
- Shared assets are in `assets/`
- Face recognition backend is in `backend/`

