#  MyJanji - Smart Contract Management with Biometric Verification

<div align="center">
  
  **Transforming informal agreements into enforceable digital contracts**
  
  [![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
  [![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask)](https://flask.palletsprojects.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
  [![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python)](https://python.org/)
</div>

---

##  Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Future Enhancements](#-future-enhancements)

---

##  Overview

**MyJanji** is a mobile-first web application that digitizes informal agreements between individuals (friends, family, colleagues) with **biometric identity verification** using facial recognition and NFC MyKad scanning. The platform generates legally-structured PDF contracts with embedded digital signatures, providing evidence trails for dispute resolution.

###  Value Proposition

> "Turn handshake deals into signed contracts  verified by your face, sealed by your identity."

---

##  Problem Statement

In Malaysia, informal lending and borrowing between friends and family often leads to:

- **Broken promises** with no documentation
- **"I never agreed to that"** disputes
- **Lost WhatsApp conversations** used as "evidence"
- **Relationship damage** due to unclear terms
- **No legal recourse** when agreements are broken

**Statistics**: Over RM 2.3 billion in informal loans go unrecovered annually in Malaysia due to lack of proper documentation.

---

##  Solution

MyJanji provides:

1. **Biometric Identity Binding** - Face + NFC verification ensures signers are who they claim to be
2. **Professional PDF Contracts** - Auto-generated from templates with filled placeholders
3. **Dual Digital Signatures** - Both parties sign with verification timestamps
4. **Cloud Storage** - Tamper-evident document storage with version history
5. **AI Contract Analysis** - Highlights important clauses for user understanding
6. **Enforcement Dashboard** - Clear next steps when agreements are breached

---

##  Key Features

###  Authentication & Verification
| Feature | Description |
|---------|-------------|
| **Face Recognition** | DeepFace (ArcFace) 512-dimension embedding comparison |
| **NFC MyKad Scanning** | R20C-USB reader validates Malaysian IC chip |
| **Dual-Factor Signing** | Both Face + NFC required for contract execution |
| **Biometric Login** | Passwordless authentication via face identification |

###  Contract Management
| Feature | Description |
|---------|-------------|
| **6 Contract Templates** | Loan, Item Borrow, Vehicle, Freelance, Deposit, Custom |
| **Dynamic PDF Generation** | DOCX template  placeholder fill  PDF conversion |
| **Signature Embedding** | Base64 signatures inserted into final documents |
| **Template Caching** | 1-hour cache reduces API calls by 80% |

###  AI Features
| Feature | Description |
|---------|-------------|
| **Contract Analysis** | Google Gemini extracts key clauses |
| **Clause Highlighting** | Important terms highlighted in PDF preview |
| **Risk Identification** | Flags payment terms, penalties, liabilities |

###  User Experience
| Feature | Description |
|---------|-------------|
| **Bilingual Support** | English & Bahasa Malaysia (i18n) |
| **Skeleton Loading** | Smooth perceived performance |
| **Real-time Status** | Contract state tracking (Pending  Ongoing  Completed) |
| **Push Notifications** | Contract signing reminders |

---

##  Tech Stack

### Frontend
```
 React 18          # UI Framework
 Vite              # Build Tool & Dev Server
 TailwindCSS       # Utility-first CSS
 Framer Motion     # Animations
 react-i18next     # Internationalization
 react-signature-canvas  # Digital signatures
 react-webcam      # Camera integration
```

### Backend
```
 Flask 3.x         # Python Web Framework
 DeepFace          # Face Recognition (ArcFace model)
 OpenCV            # Image Processing
 Tesseract OCR     # IC Text Extraction
 python-docx       # Word Document Manipulation
 docx2pdf          # PDF Conversion
 PyMuPDF (fitz)    # PDF Highlighting
 Google Gemini     # AI Contract Analysis
```

### Database & Storage
```
 Supabase          # Backend-as-a-Service
    PostgreSQL    # Relational Database
    Auth          # User Authentication
    Storage       # PDF & Template Buckets
    Realtime      # Live Updates
```

### Hardware Integration
```
 R20C-USB NFC Reader   # MyKad Chip Reading
 Webcam               # Face Capture
 Microsoft Word       # PDF Conversion (via COM)
```

---

##  System Architecture

```

                        FRONTEND (React + Vite)                  
               
  Dashboard  Contracts    Create     Sign              
    Page       Page      Contract   Contract           
               
                        
                                                                
                                       
                 Supabase Client                              
                (Auth + DB + Storage)                         
                                       

                            HTTPS

                    BACKEND (Flask API)                          
                  
  face_service  contract_svc   ocr_service               
    (DeepFace)  (PDF Gen)      (Tesseract)               
                  
                                  
  ai_annotation pdf_highlight                               
    (Gemini)      (PyMuPDF)                                 
                                  

                           

                      SUPABASE CLOUD                             
               
     users         contracts       Storage               
   (profiles,     (form_data,    (PDFs,                  
    embeddings)    signatures)    templates)             
               

```

---

##  Project Structure

```
MyJanji V3/
  backend/                    # Flask API Server
    app.py                     # Main routes (15+ endpoints)
    face_service.py            # DeepFace integration
    contract_service.py        # PDF generation & caching
    ocr_service.py             # Tesseract IC extraction
    ai_annotation_service.py   # Gemini AI analysis
    pdf_highlight_service.py   # PyMuPDF highlighting
    config.py                  # Environment configuration
    requirements.txt           # Python dependencies
    templates_config.json      # Template-placeholder mapping
     prepared_contracts/     # Temp PDF storage
     temp_signatures/        # Signature images
     uploads/                # IC image uploads

  myjanji-react/              # React Frontend
     src/
       App.jsx                # Main app with routing
       i18n.js                # i18next configuration
        components/
           contracts/      # Contract cards, forms
           features/       # NFC, Face, Signature, AI
           layout/         # Header, BottomNav
           ui/             # Button, Card, Modal, etc.
        pages/              # All page components
        services/           # API service layers
        context/            # React Context providers
        locales/            # en.json, bm.json
        lib/                # Supabase client
    package.json
    vite.config.js

  nfc-service/                # NFC Reader Integration
    nfc_reader.py              # R20C-USB communication
    requirements.txt

  contract_generator/         # Standalone PDF testing
    generate_contract.py

 README.md                      # This file
```

---

##  Installation & Setup

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 18.x+ | Frontend runtime |
| Python | 3.10+ | Backend runtime |
| Microsoft Word | 2016+ | PDF conversion (Windows) |
| Tesseract OCR | 5.x | IC text extraction |
| Git | Latest | Version control |

### 1. Clone Repository

```bash
git clone https://github.com/cmcmcm28/MyJanjiV3.git
cd MyJanjiV3
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Configure environment variables in config.py or create .env file:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
```

### 3. Frontend Setup

```bash
# Navigate to frontend
cd myjanji-react

# Install dependencies
npm install
```

**Create .env file:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND_URL=http://localhost:5000
```

### 4. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL migrations in myjanji-react/supabase_dummy_contracts.sql
3. Create storage buckets:
   - contract_templates (public)
   - contract-pdf (private)
4. Upload DOCX templates to contract_templates bucket

### 5. Tesseract OCR Setup (Windows)

1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to C:\Program Files\Tesseract-OCR\
3. Add to PATH environment variable

---

##  Running the Application

### Start Backend Server

```bash
cd backend
python app.py
```

**Expected output:**
```
==================================================
 Starting Flask Facial Recognition Server
==================================================
 Server URL: http://0.0.0.0:5000
 Health Check: http://0.0.0.0:5000/health
==================================================
```

### Start Frontend Development Server

```bash
cd myjanji-react
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in 500ms

    Local:   http://localhost:5173/
    Network: http://192.168.x.x:5173/
```

### Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Health Check | http://localhost:5000/health |
| Cache Status | http://localhost:5000/admin/cache_status |

---

##  API Endpoints

### Authentication & Face Recognition

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /upload_ic | Upload IC image for registration |
| POST | /extract_ic | OCR extraction from IC |
| POST | /process_frame | Verify face against stored IC |
| POST | /verify_login | Login with face + stored embedding |
| POST | /identify_face | Identify user from face (1 API call) |

### Contract Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /prepare_contract | Generate PDF, store temporarily |
| GET | /get_prepared_contract/:id | Retrieve prepared PDF |
| POST | /create_contract | Finalize & upload to storage |
| POST | /sign_contract | Acceptor signs contract |
| POST | /preview_contract | Generate preview PDF blob |

### AI Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /analyze_contract | AI clause extraction |
| GET | /get_agreement_text/:id | Get contract text for analysis |
| POST | /get_highlighted_pdf | PDF with AI highlights |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /admin/cache_status | Template cache info |
| POST | /admin/clear_cache | Clear template cache |

---

##  Database Schema

### users Table
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  ic_number VARCHAR(20),
  nfc_chip_id VARCHAR(100),           -- MyKad NFC chip ID
  face_embedding FLOAT8[512],          -- DeepFace ArcFace vector
  created_at TIMESTAMP DEFAULT NOW()
);
```

### contracts Table
```sql
CREATE TABLE contracts (
  contract_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_name VARCHAR(255),
  contract_topic VARCHAR(255),
  template_type VARCHAR(50),           -- FRIENDLY_LOAN, ITEM_BORROW, etc.
  status VARCHAR(20) DEFAULT 'Pending', -- Pending, Ongoing, Completed
  user_id UUID REFERENCES users(user_id),      -- Creator
  acceptee_id UUID REFERENCES users(user_id),  -- Acceptor
  form_data JSONB,                     -- All form fields
  pdf_url TEXT,                        -- Supabase storage URL
  due_date DATE,
  creator_signed_at TIMESTAMP,
  acceptee_signed_at TIMESTAMP,
  creator_nfc_verified BOOLEAN DEFAULT FALSE,
  creator_face_verified BOOLEAN DEFAULT FALSE,
  acceptor_nfc_verified BOOLEAN DEFAULT FALSE,
  acceptor_face_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

##  Future Enhancements

| Feature | Description | Priority |
|---------|-------------|----------|
| Mobile App | React Native / Flutter port | High |
| Blockchain | Immutable contract hashes on chain | Medium |
| E-Stamp Integration | LHDN e-stamping API | Medium |
| Lawyer Verification | Professional witness signing | Low |
| Court Document Export | Format for legal proceedings | Low |
| WhatsApp Bot | Contract creation via chat | Medium |

---

##  License

This project is developed as a prototype and is not licensed for commercial use.

---

##  Acknowledgments

- [DeepFace](https://github.com/serengil/deepface) - Face recognition library
- [Supabase](https://supabase.com) - Backend infrastructure
- [Google Gemini](https://ai.google.dev/) - AI contract analysis
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) - Text extraction

---

<div align="center">
  <b>Built with  for Malaysians</b>
  <br/>
  <i>"Janji ditepati, hubungan terjaga"</i>
  <br/>
  <i>(Promises kept, relationships preserved)</i>
</div>
