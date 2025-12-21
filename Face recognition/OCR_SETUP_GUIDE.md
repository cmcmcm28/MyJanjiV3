# OCR Setup Guide for IC Image Extraction

## What You Need to Do

### Step 1: Install Python Dependencies

Navigate to the `Face recognition` folder and install the required OCR library:

```bash
cd "Face recognition"
pip install easyocr
```

**Note:** EasyOCR will download model files on first use (about 100-200MB). This happens automatically when you first run OCR.

### Step 2: Restart Your Flask Server

After installing EasyOCR, restart your Flask server:

```bash
python app.py
```

You should see:
- `⏳ Initializing EasyOCR (this may take a moment)...` (on first OCR call)
- `✅ EasyOCR ready!`

## What I've Changed in the Code

### Backend (Python Flask)

1. **Added OCR Dependencies** (`requirements.txt`):
   - `easyocr>=1.7.0` - Main OCR library
   - `pytesseract>=0.3.10` - Alternative OCR (optional)

2. **Added OCR Function** (`app.py`):
   - `extract_ic_details(image_path)` - Extracts IC details using EasyOCR
   - Extracts: Name, IC Number, Date of Birth, Gender, Address

3. **Updated `/upload_ic` Endpoint**:
   - Now returns OCR data along with face recognition results
   - Response includes `ocr_data` field with extracted details

4. **New `/extract_ic` Endpoint**:
   - Dedicated endpoint for OCR extraction only
   - Can be called separately if you only need OCR

### Frontend (React)

1. **Updated `faceAuthService.js`**:
   - `uploadIC()` now returns `ocrData` in response
   - Added new `extractICDetails()` method for dedicated OCR extraction

2. **Updated `RegisterPage.jsx`**:
   - Automatically extracts IC details when image is uploaded
   - Auto-fills form fields (name, IC number) with extracted data
   - User can still edit the fields if OCR makes mistakes

## How It Works

1. **User uploads IC image** → Frontend sends to backend
2. **Backend processes image**:
   - Runs OCR to extract text
   - Uses regex patterns to find IC number, name, etc.
   - Generates face embedding for verification
3. **Backend returns data**:
   - OCR extracted details (name, IC number, DOB, gender)
   - Face recognition status
4. **Frontend auto-fills form**:
   - Name field
   - IC Number field
   - User can verify and edit if needed

## Extracted Fields

The OCR extracts:
- **IC Number**: Format `YYMMDD-PB-G###` (e.g., `901212-10-5599`)
- **Name**: Text found before IC number
- **Date of Birth**: Calculated from IC number
- **Gender**: Determined from IC number (odd = Male, even = Female)
- **Address**: If present (lines containing address keywords)

## Testing

1. Upload an IC image in the registration page
2. Check the browser console for extracted data
3. Verify that form fields are auto-filled
4. Check Flask server logs for OCR output

## Troubleshooting

### If OCR doesn't work:
- Make sure EasyOCR is installed: `pip install easyocr`
- Check Flask server logs for errors
- First OCR call will download models (may take a few minutes)
- If image quality is poor, OCR accuracy may be low

### If extraction is inaccurate:
- Ensure IC image is clear and well-lit
- IC should be flat and not at an angle
- Text should be readable in the image
- You can manually edit the auto-filled fields

## Alternative: Using Tesseract OCR

If you prefer Tesseract instead of EasyOCR:

1. Install Tesseract:
   - Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
   - Add to PATH or specify path in code

2. Install Python wrapper:
   ```bash
   pip install pytesseract
   ```

3. Update `app.py` to use Tesseract instead of EasyOCR

