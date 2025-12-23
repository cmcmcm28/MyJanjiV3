# OCR Service for Malaysian IC Extraction
import cv2
import re
import gc

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("⚠️ EasyOCR not available. Install with: pip install easyocr")

# Module-level OCR reader (lazy loading)
_ocr_reader = None


def init_reader():
    """Initialize EasyOCR reader with GPU fallback"""
    global _ocr_reader
    if _ocr_reader is None and EASYOCR_AVAILABLE:
        print("⏳ Initializing EasyOCR (this may take a moment)...")
        try:
            _ocr_reader = easyocr.Reader(['en', 'ms'], gpu=True)
            print("✅ EasyOCR ready (GPU enabled)!")
        except Exception as e:
            print(f"⚠️ GPU not available, using CPU: {e}")
            _ocr_reader = easyocr.Reader(['en', 'ms'], gpu=False)
            print("✅ EasyOCR ready (CPU mode)!")
    return _ocr_reader


def resize_for_ocr(image_path, max_size=1200):
    """Resize image if too large for faster OCR processing"""
    img = cv2.imread(image_path)
    if img is not None and max(img.shape[:2]) > max_size:
        scale = max_size / max(img.shape[:2])
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        cv2.imwrite(image_path, img)
        print(f"📏 Image resized to {img.shape[1]}x{img.shape[0]} for faster OCR")
        del img
        gc.collect()
        return True
    return False


def extract_ic_details(image_path):
    """Extract details from Malaysian IC using OCR"""
    if not EASYOCR_AVAILABLE:
        return {"error": "OCR not available. Please install easyocr."}

    try:
        reader = init_reader()
        if reader is None:
            return {"error": "Failed to initialize OCR reader"}

        print("🔍 Running OCR on IC image...")
        resize_for_ocr(image_path)
        
        results = reader.readtext(image_path)
        full_text = ' '.join([result[1] for result in results])

        extracted = {}

        # IC Number pattern: YYMMDD-PB-G###
        ic_pattern = r'\b\d{6}-\d{2}-\d{4}\b'
        ic_match = re.search(ic_pattern, full_text)
        if ic_match:
            extracted['icNumber'] = ic_match.group(0)
            dob_str = ic_match.group(0).split('-')[0]
            if len(dob_str) == 6:
                year = int(dob_str[:2])
                month = dob_str[2:4]
                day = dob_str[4:6]
                full_year = 2000 + year if year <= 30 else 1900 + year
                extracted['dateOfBirth'] = f"{full_year}-{month}-{day}"
                extracted['gender'] = 'Male' if int(ic_match.group(0).split('-')[2][-1]) % 2 == 1 else 'Female'

        # Name extraction with multiple strategies
        lines = [result[1] for result in results]
        lines_with_positions = [(result[0], result[1]) for result in results]

        ic_line_index = -1
        for i, line in enumerate(lines):
            if ic_match and ic_match.group(0) in line:
                ic_line_index = i
                break

        name_candidates = []

        # Strategy 1: Text before IC number
        if ic_line_index > 0:
            for i in range(max(0, ic_line_index - 5), ic_line_index):
                candidate = lines[i].strip()
                if (candidate and len(candidate) > 3 and
                    not re.match(r'^\d', candidate) and
                    not re.match(r'^[A-Z]{1,2}\d', candidate) and
                    'MALAYSIA' not in candidate.upper() and
                    'KAD' not in candidate.upper() and
                    'PENGENALAN' not in candidate.upper() and
                    len(candidate.split()) >= 2):
                    name_candidates.append((i, candidate, 'before_ic'))

        # Strategy 2: Position-based (top of card)
        if lines_with_positions:
            try:
                sorted_by_y = sorted(lines_with_positions, 
                    key=lambda x: x[0][0][1] if len(x[0]) > 0 and len(x[0][0]) > 1 else 9999)
                for idx, (bbox, text) in enumerate(sorted_by_y[:8]):
                    text_clean = text.strip()
                    if (text_clean and len(text_clean) > 3 and
                        not re.match(r'^\d', text_clean) and
                        'MALAYSIA' not in text_clean.upper() and
                        len(text_clean.split()) >= 2):
                        name_candidates.append((idx, text_clean, 'position_top'))
                        if len([c for c in name_candidates if c[2] == 'position_top']) >= 3:
                            break
            except Exception as e:
                print(f"⚠️ Position detection error: {e}")

        # Strategy 3: All caps names
        for i, line in enumerate(lines):
            text_clean = line.strip()
            if (text_clean and len(text_clean) > 5 and text_clean.isupper() and
                len(text_clean.split()) >= 2 and not re.match(r'^\d', text_clean) and
                'MALAYSIA' not in text_clean and
                ic_match and ic_match.group(0) not in text_clean):
                name_candidates.append((i, text_clean, 'all_caps'))
                break

        # Select best candidate
        if name_candidates:
            print(f"📝 Name candidates: {[c[1] for c in name_candidates]}")
            all_caps = [c for c in name_candidates if c[2] == 'all_caps']
            if all_caps:
                best_name = max(all_caps, key=lambda x: (len(x[1].split()), len(x[1])))
            else:
                best_name = max(name_candidates, key=lambda x: (len(x[1].split()), len(x[1])))
            
            best_name_text = re.sub(r'\s+', ' ', best_name[1]).strip()
            best_name_text = re.sub(
                r'^(MR|MRS|MS|DR|PROF|TAN SRI|DATUK|DATO|TUAN|PUAN)\s+', 
                '', best_name_text, flags=re.IGNORECASE
            ).strip()
            extracted['name'] = best_name_text

        # Address extraction
        address_keywords = ['JALAN', 'JLN', 'TAMAN', 'KAMPUNG', 'KG', 'LOT', 'NO']
        address_lines = [line.strip() for line in lines 
                        if any(kw in line.upper() for kw in address_keywords)]
        if address_lines:
            extracted['address'] = ', '.join(address_lines[:3])

        return extracted

    except Exception as e:
        print(f"❌ OCR Error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
