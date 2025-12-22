import os
import cv2
import numpy as np
import psycopg2
import base64
import time
import gc
import re
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
from deepface import DeepFace
from dotenv import load_dotenv
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("⚠️ EasyOCR not available. Install with: pip install easyocr")

# Load .env file from current directory
load_dotenv()

app = Flask(__name__)
# Enable CORS for Flutter app
CORS(app, resources={r"/*": {"origins": "*"}})

# --- CONFIGURATION ---
# Replace with your actual URI from environment variable
# Set DB_URI environment variable before running: export DB_URI="your_connection_string"
# IMPORTANT: Never commit database credentials to version control!
DB_URI = os.getenv("DB_URI")
if not DB_URI:
    raise ValueError(
        "DB_URI environment variable is required. Please set it before running the application.")
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
MODEL_NAME = "Facenet512"  # Keep original model for compatibility
PASSING_THRESHOLD_DISTANCE = 20.0  # Original threshold
PASSING_THRESHOLD_PERCENTAGE = 45.0  # Minimum score percentage to pass
MAX_IMAGE_SIZE = 800  # Maximum dimension for image processing to reduce memory

# --- AI WARMUP ---
print("⏳ Warming up DeepFace AI... (This runs once)")
try:
    # Use a smaller test image for warmup
    test_img = np.zeros((100, 100, 3), dtype=np.uint8)
    DeepFace.represent(img_path=test_img,
                       model_name=MODEL_NAME,
                       enforce_detection=False,
                       detector_backend='opencv')
    del test_img
    gc.collect()
    print("✅ AI Ready!")
except Exception as e:
    print(f"⚠️ Warmup warning: {e}")
    pass


def get_db_connection():
    """Get database connection with timeout"""
    return psycopg2.connect(DB_URI, connect_timeout=10)


# Initialize EasyOCR reader (lazy loading)
ocr_reader = None


def get_ocr_reader():
    global ocr_reader
    if ocr_reader is None and EASYOCR_AVAILABLE:
        print("⏳ Initializing EasyOCR (this may take a moment)...")
        # Try to use GPU for faster OCR, fall back to CPU if not available
        try:
            ocr_reader = easyocr.Reader(['en', 'ms'], gpu=True)  # English and Malay with GPU
            print("✅ EasyOCR ready (GPU enabled)!")
        except Exception as e:
            print(f"⚠️ GPU not available, using CPU: {e}")
            ocr_reader = easyocr.Reader(['en', 'ms'], gpu=False)
            print("✅ EasyOCR ready (CPU mode)!")
    return ocr_reader


def extract_ic_details(image_path):
    """Extract details from Malaysian IC using OCR"""
    if not EASYOCR_AVAILABLE:
        return {"error": "OCR not available. Please install easyocr."}

    try:
        reader = get_ocr_reader()
        if reader is None:
            return {"error": "Failed to initialize OCR reader"}

        print("🔍 Running OCR on IC image...")

        # Resize image if too large for faster OCR processing
        img = cv2.imread(image_path)
        if img is not None and max(img.shape[:2]) > 1200:
            scale = 1200 / max(img.shape[:2])
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            cv2.imwrite(image_path, img)
            print(f"📏 Image resized to {img.shape[1]}x{img.shape[0]} for faster OCR")
            del img
            gc.collect()

        results = reader.readtext(image_path)

        # Combine all text
        full_text = ' '.join([result[1] for result in results])

        # Extract IC details using regex patterns
        extracted = {}

        # IC Number pattern: YYMMDD-PB-G### (e.g., 901212-10-5599)
        ic_pattern = r'\b\d{6}-\d{2}-\d{4}\b'
        ic_match = re.search(ic_pattern, full_text)
        if ic_match:
            extracted['icNumber'] = ic_match.group(0)
            # Extract date of birth from IC number
            dob_str = ic_match.group(0).split('-')[0]
            if len(dob_str) == 6:
                year = int(dob_str[:2])
                month = dob_str[2:4]
                day = dob_str[4:6]
                # Malaysian IC: years 00-30 are 2000-2030, 31-99 are 1931-1999
                full_year = 2000 + year if year <= 30 else 1900 + year
                extracted['dateOfBirth'] = f"{full_year}-{month}-{day}"
                extracted['gender'] = 'Male' if int(
                    ic_match.group(0).split('-')[1]) % 2 == 1 else 'Female'

        # Name extraction: Improved logic with multiple strategies
        # Malaysian IC format: Name is usually at the top, before IC number, in ALL CAPS
        lines = [result[1] for result in results]
        lines_with_positions = [(result[0], result[1])
                                for result in results]  # (bbox, text)

        # Find IC number line index
        ic_line_index = -1
        for i, line in enumerate(lines):
            if ic_match and ic_match.group(0) in line:
                ic_line_index = i
                break

        name_candidates = []

        # Strategy 1: Look for text before IC number (up to 5 lines back)
        if ic_line_index > 0:
            for i in range(max(0, ic_line_index - 5), ic_line_index):
                candidate = lines[i].strip()
                # Filter criteria for valid names
                if (candidate and
                    len(candidate) > 3 and
                    # Doesn't start with number
                    not re.match(r'^\d', candidate) and
                    # Not codes like "A1", "B2"
                    not re.match(r'^[A-Z]{1,2}\d', candidate) and
                    'MALAYSIA' not in candidate.upper() and
                    'IC' not in candidate.upper() and
                    'IDENTITY' not in candidate.upper() and
                    'CARD' not in candidate.upper() and
                    'KAD' not in candidate.upper() and
                    'PENGENALAN' not in candidate.upper() and
                    'WARGA' not in candidate.upper() and
                    'NEGARA' not in candidate.upper() and
                        len(candidate.split()) >= 2):  # Name usually has 2+ words
                    name_candidates.append((i, candidate, 'before_ic'))

        # Strategy 2: Use position-based detection (name is usually at the top)
        if lines_with_positions:
            # Sort by y-coordinate (top to bottom) - name is usually near the top
            try:
                sorted_by_y = sorted(lines_with_positions, key=lambda x: x[0][0][1] if len(
                    x[0]) > 0 and len(x[0][0]) > 1 else 9999)

                # Check top 8 lines (name is usually in first few lines)
                for idx, (bbox, text) in enumerate(sorted_by_y[:8]):
                    text_clean = text.strip()
                    # More lenient filtering for position-based detection
                    if (text_clean and
                        len(text_clean) > 3 and
                        not re.match(r'^\d', text_clean) and
                        # Not IC number
                        not re.match(r'^\d{6}-\d{2}-\d{4}', text_clean) and
                        'MALAYSIA' not in text_clean.upper() and
                        'IC' not in text_clean.upper() and
                        'IDENTITY' not in text_clean.upper() and
                        'CARD' not in text_clean.upper() and
                            len(text_clean.split()) >= 2):  # At least 2 words
                        name_candidates.append(
                            (idx, text_clean, 'position_top'))
                        # Get top 3 candidates
                        if len([c for c in name_candidates if c[2] == 'position_top']) >= 3:
                            break
            except Exception as e:
                print(f"⚠️ Error in position-based detection: {e}")

        # Strategy 3: Look for text that looks like a name (all caps, multiple words)
        # Malaysian names on IC are often in ALL CAPS
        for i, line in enumerate(lines):
            text_clean = line.strip()
            # Malaysian names are often in ALL CAPS on IC
            if (text_clean and
                len(text_clean) > 5 and
                text_clean.isupper() and  # All uppercase (common for Malaysian IC names)
                len(text_clean.split()) >= 2 and  # Multiple words
                not re.match(r'^\d', text_clean) and
                'MALAYSIA' not in text_clean and
                    # Not IC number
                    ic_match and ic_match.group(0) not in text_clean):
                name_candidates.append((i, text_clean, 'all_caps'))
                # Prefer all-caps names, so break after first good one
                break

        # Select the best candidate
        if name_candidates:
            print(
                f"📝 Name candidates found: {[c[1] for c in name_candidates]}")

            # Prefer candidates that:
            # 1. Are all caps (Strategy 3) - highest priority
            # 2. Have more words
            # 3. Are longer
            # 4. Are closer to top (if using position-based)

            all_caps_candidates = [
                c for c in name_candidates if c[2] == 'all_caps']
            if all_caps_candidates:
                # Prefer all-caps names (most reliable for Malaysian IC)
                best_name = max(all_caps_candidates, key=lambda x: (
                    len(x[1].split()), len(x[1])))
            else:
                # Otherwise, use other strategies
                best_name = max(name_candidates, key=lambda x: (
                    len(x[1].split()),  # More words = better
                    len(x[1]),  # Longer = better
                    # Closer to top = better
                    -x[0] if isinstance(x[0], int) else 0
                ))

            best_name_text = best_name[1]

            # Clean up the name
            best_name_text = re.sub(r'\s+', ' ', best_name_text).strip()
            # Remove common titles/prefixes
            best_name_text = re.sub(
                r'^(MR|MRS|MS|DR|PROF|TAN SRI|DATUK|DATO|TUAN|PUAN)\s+', '', best_name_text, flags=re.IGNORECASE)
            best_name_text = best_name_text.strip()

            extracted['name'] = best_name_text
        else:
            pass  # No name found, continue without it

        # Address extraction (if present)
        address_keywords = ['JALAN', 'JLN',
                            'TAMAN', 'KAMPUNG', 'KG', 'LOT', 'NO']
        address_lines = []
        for line in lines:
            if any(keyword in line.upper() for keyword in address_keywords):
                address_lines.append(line.strip())
        if address_lines:
            extracted['address'] = ', '.join(
                address_lines[:3])  # Take first 3 address lines

        return extracted

    except Exception as e:
        print(f"❌ OCR Error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}


def resize_image_if_needed(img_path_or_array, max_size=MAX_IMAGE_SIZE, min_size=320):
    """Resize image if it's too large to reduce memory usage, but keep it large enough for face detection"""
    if isinstance(img_path_or_array, str):
        img = cv2.imread(img_path_or_array)
    else:
        img = img_path_or_array.copy()

    if img is None:
        return img_path_or_array

    height, width = img.shape[:2]
    max_dim = max(height, width)
    min_dim = min(height, width)

    # Only resize if too large, but ensure minimum size for face detection
    if max_dim > max_size:
        scale = max_size / max_dim
        new_width = int(width * scale)
        new_height = int(height * scale)
        # Ensure we don't resize too small
        if min(new_width, new_height) < min_size:
            scale = min_size / min_dim
            new_width = int(width * scale)
            new_height = int(height * scale)
        img = cv2.resize(img, (new_width, new_height),
                         interpolation=cv2.INTER_AREA)

    return img


def generate_embedding(img_input):
    """Generate face embedding with memory optimization"""
    try:
        # If input is numpy array, save it temporarily for DeepFace
        if isinstance(img_input, np.ndarray):
            temp_path = os.path.join(
                UPLOAD_FOLDER, f"temp_embed_{int(time.time())}.jpg")
            # Convert RGB to BGR for OpenCV
            if len(img_input.shape) == 3 and img_input.shape[2] == 3:
                bgr_img = cv2.cvtColor(img_input, cv2.COLOR_RGB2BGR)
            else:
                bgr_img = img_input
            cv2.imwrite(temp_path, bgr_img)
            processed_img = temp_path
        else:
            # It's a file path string
            processed_img = resize_image_if_needed(img_input)

        print("🔍 Generating face embedding...")
        embedding_obj = DeepFace.represent(
            img_path=processed_img,
            model_name=MODEL_NAME,
            enforce_detection=False,
            detector_backend='opencv'
        )

        embedding = embedding_obj[0]["embedding"]
        print(f"✅ Embedding generated (length: {len(embedding)})")

        # Clean up temp file if we created one
        if isinstance(img_input, np.ndarray) and os.path.exists(processed_img):
            try:
                os.remove(processed_img)
            except:
                pass

        # Clean up
        if isinstance(processed_img, np.ndarray):
            del processed_img
        gc.collect()

        return embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        import traceback
        traceback.print_exc()
        # Clean up temp file on error
        if isinstance(img_input, np.ndarray) and 'temp_path' in locals():
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except:
                pass
        # Clean up on error
        gc.collect()
        raise

# --- ROUTES ---


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload_ic', methods=['POST'])
def upload_ic():
    # Add CORS headers for Flutter
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    if 'ic_image' not in request.files:
        response = jsonify({"status": "error", "message": "No file part"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400

    file = request.files['ic_image']
    if file.filename == '':
        response = jsonify({"status": "error", "message": "No selected file"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400

    filepath = os.path.join(UPLOAD_FOLDER, "user_ic.jpg")
    file.save(filepath)

    try:
        # Extract IC details using OCR
        ocr_data = extract_ic_details(filepath)

        # Generate face embedding
        embedding = generate_embedding(filepath)
        conn = get_db_connection()
        cur = conn.cursor()

        # Reset DB for single-user session
        cur.execute("DELETE FROM pictures;")
        cur.execute("INSERT INTO pictures (picture, embedding) VALUES (%s, %s)",
                    ("user_ic.jpg", embedding))
        conn.commit()
        cur.close()
        conn.close()

        # Store embedding for response before cleanup
        embedding_list = list(embedding) if embedding else None

        # Clean up file reference
        del embedding
        gc.collect()

        print("✅ New IC Registered!")

        # Return JSON with CORS headers including OCR data and embedding
        response = jsonify({
            "status": "success",
            "message": "IC uploaded successfully",
            "redirect": url_for('verify_page'),
            "ocr_data": ocr_data,  # Include extracted data
            "face_embedding": embedding_list  # Include face embedding for frontend storage
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error uploading IC: {e}")
        import traceback
        traceback.print_exc()
        gc.collect()  # Clean up on error
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/extract_ic', methods=['POST'])
def extract_ic():
    """Dedicated endpoint for IC OCR extraction"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    if 'ic_image' not in request.files:
        response = jsonify({"status": "error", "message": "No file part"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400

    file = request.files['ic_image']
    if file.filename == '':
        response = jsonify({"status": "error", "message": "No selected file"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400

    filepath = os.path.join(
        UPLOAD_FOLDER, f"ic_extract_{int(time.time())}.jpg")
    file.save(filepath)

    try:
        ocr_data = extract_ic_details(filepath)

        # Clean up temp file
        if os.path.exists(filepath):
            os.remove(filepath)

        response = jsonify({
            "status": "success",
            "data": ocr_data
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error extracting IC: {e}")
        import traceback
        traceback.print_exc()
        # Clean up temp file on error
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/verify_page')
def verify_page():
    return render_template('verify.html')


@app.route('/success')
def success_page():
    return render_template('success.html')


@app.route('/process_frame', methods=['POST'])
def process_frame():
    try:
        # Add CORS headers for Flutter
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add(
                'Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json.get('image', '')
        if not data:
            response = jsonify(
                {"status": "error", "message": "No image data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Handle base64 string with or without data URL prefix
        if ',' in data:
            image_data = data.split(',')[1]
        else:
            image_data = data

        try:
            decoded_image = base64.b64decode(image_data)
        except Exception as decode_error:
            response = jsonify(
                {"status": "error", "message": f"Failed to decode base64: {str(decode_error)}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        np_arr = np.frombuffer(decoded_image, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Clean up decoded image buffer
        del decoded_image, np_arr
        gc.collect()

        if frame is None:
            response = jsonify(
                {"status": "error", "message": "Failed to decode image"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Resize frame if too large to reduce memory usage
        if max(frame.shape[:2]) > MAX_IMAGE_SIZE:
            frame = resize_image_if_needed(frame)

        # Use local haarcascade file if available, otherwise use OpenCV's built-in
        cascade_path = os.path.join(os.path.dirname(
            __file__), 'haarcascade_frontalface_default.xml')
        if os.path.exists(cascade_path):
            haar_cascade = cv2.CascadeClassifier(cascade_path)
        else:
            haar_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

        if haar_cascade.empty():
            del frame
            gc.collect()
            response = jsonify(
                {"status": "error", "message": "Failed to load face detection cascade"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        # Use OpenCV Haar Cascade with VERY lenient parameters
        gray_img = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Try multiple detection attempts with increasingly lenient parameters
        faces = []

        # Attempt 1: Very lenient
        min_face_size_1 = max(15, min(frame.shape[1], frame.shape[0]) // 20)
        faces = haar_cascade.detectMultiScale(
            gray_img,
            scaleFactor=1.05,
            minNeighbors=1,
            minSize=(min_face_size_1, min_face_size_1),
            flags=cv2.CASCADE_SCALE_IMAGE
        )

        # Attempt 2: Even more lenient
        if len(faces) == 0:
            min_face_size_2 = max(
                10, min(frame.shape[1], frame.shape[0]) // 30)
            faces = haar_cascade.detectMultiScale(
                gray_img,
                scaleFactor=1.03,
                minNeighbors=1,
                minSize=(min_face_size_2, min_face_size_2),
                flags=cv2.CASCADE_SCALE_IMAGE
            )

        # Attempt 3: Use entire frame if still no face (let DeepFace handle it)
        rgb_face = None
        try:
            if len(faces) == 0:
                # Clean up gray_img if it exists
                if 'gray_img' in locals():
                    del gray_img
                    gc.collect()
                # Use entire frame - DeepFace will detect internally
                rgb_face = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            else:
                largest_face = max(faces, key=lambda f: f[2] * f[3])
                x, y, w, h = largest_face

                # Add generous padding
                padding = 50
                x = max(0, x - padding)
                y = max(0, y - padding)
                w = min(frame.shape[1] - x, w + padding * 2)
                h = min(frame.shape[0] - y, h + padding * 2)

                try:
                    # Validate coordinates first
                    if x < 0 or y < 0 or x+w > frame.shape[1] or y+h > frame.shape[0]:
                        raise ValueError(
                            f"Invalid crop coordinates: x={x}, y={y}, w={w}, h={h}, frame={frame.shape}")

                    # Extract face crop and save to file for smoother processing
                    face_crop = frame[y:y+h, x:x+w]

                    # Save to file to avoid memory issues
                    face_crop_path = os.path.join(
                        UPLOAD_FOLDER, f"face_crop_{int(time.time())}.jpg")
                    cv2.imwrite(face_crop_path, face_crop)

                    # Use file path for embedding generation
                    rgb_face = face_crop_path

                    # Clean up immediately
                    del face_crop
                    if 'gray_img' in locals():
                        del gray_img
                    gc.collect()

                except Exception as crop_error:
                    if 'frame' in locals():
                        del frame
                    if 'gray_img' in locals():
                        del gray_img
                    gc.collect()
                    response = jsonify(
                        {"status": "error", "message": f"Error extracting face: {str(crop_error)}"})
                    response.headers.add('Access-Control-Allow-Origin', '*')
                    return response, 500
        except Exception as face_process_error:
            import traceback
            traceback.print_exc()
            if 'frame' in locals():
                del frame
            gc.collect()
            response = jsonify(
                {"status": "error", "message": f"Error processing face: {str(face_process_error)}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        if rgb_face is None:
            del frame
            gc.collect()
            response = jsonify(
                {"status": "error", "message": "Failed to process face image"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        # Clean up frame
        try:
            if 'frame' in locals():
                del frame
            gc.collect()
        except:
            pass

        # Generate embedding
        face_crop_file_path = rgb_face if isinstance(rgb_face, str) else None
        try:
            embedding = generate_embedding(rgb_face)
        except Exception as embed_error:
            import traceback
            traceback.print_exc()
            # Clean up temp file on error
            if face_crop_file_path and os.path.exists(face_crop_file_path):
                try:
                    os.remove(face_crop_file_path)
                except:
                    pass
            if not isinstance(rgb_face, str):
                del rgb_face
            gc.collect()
            response = jsonify(
                {"status": "error", "message": f"Failed to process face: {str(embed_error)}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        # Clean up temp face crop file if we created one
        if 'face_crop_file_path' in locals() and face_crop_file_path and os.path.exists(face_crop_file_path):
            try:
                os.remove(face_crop_file_path)
            except:
                pass

        # Clean up rgb_face if it's a numpy array
        if 'rgb_face' in locals() and not isinstance(rgb_face, str) and rgb_face is not None:
            del rgb_face
        gc.collect()

        # Database query
        row = None
        conn = None
        cur = None
        try:
            print("🔍 Querying database for face match...")
            conn = get_db_connection()
            cur = conn.cursor()

            # Check if table exists and has data first
            print("📊 Checking pictures table...")
            cur.execute("SELECT COUNT(*) FROM pictures;")
            count = cur.fetchone()[0]
            print(f"📊 Found {count} records in pictures table")

            if count == 0:
                print("⚠️ No records found in pictures table")
                cur.close()
                conn.close()
                del embedding
                gc.collect()
                response = jsonify(
                    {"status": "error", "message": "No ID record found. Please upload your IC first."})
                response.headers.add('Access-Control-Allow-Origin', '*')
                return response, 404

            # Create embedding string representation
            print("📝 Creating embedding string...")
            string_rep = "[" + ",".join(str(x) for x in embedding) + "]"
            print(
                f"✅ Embedding string created (length: {len(string_rep)} chars)")

            print("🔍 Executing similarity search...")
            import time
            start_time = time.time()

            # Try the query - handle both vector and array formats
            try:
                # First try with explicit vector cast
                cur.execute("""
                    SELECT picture, (embedding <-> %s::vector) as distance 
                    FROM pictures 
                    ORDER BY embedding <-> %s::vector ASC 
                    LIMIT 1;
                """, (string_rep, string_rep))
            except Exception as vector_error:
                print(
                    f"⚠️ Vector cast failed, trying without cast: {vector_error}")
                # Fallback: try without explicit cast (PostgreSQL should infer it)
                cur.execute("""
                    SELECT picture, (embedding <-> %s) as distance 
                    FROM pictures 
                    ORDER BY embedding <-> %s ASC 
                    LIMIT 1;
                """, (string_rep, string_rep))

            row = cur.fetchone()
            elapsed_time = time.time() - start_time
            print(f"✅ Database query completed in {elapsed_time:.2f} seconds")

            cur.close()
            conn.close()

            # Clean up embedding and string_rep after successful query
            del embedding, string_rep
            gc.collect()
        except psycopg2.Error as db_error:
            print(f"❌ PostgreSQL error: {db_error}")
            if hasattr(db_error, 'pgcode'):
                print(f"   Error code: {db_error.pgcode}")
            if hasattr(db_error, 'pgerror'):
                print(f"   Error message: {db_error.pgerror}")
            import traceback
            traceback.print_exc()
            # Ensure database connection is closed
            try:
                if cur:
                    cur.close()
                if conn:
                    conn.close()
            except:
                pass
            if 'embedding' in locals():
                del embedding
            if 'string_rep' in locals():
                del string_rep
            gc.collect()
            response = jsonify(
                {"status": "error", "message": f"Database error: {str(db_error)}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500
        except Exception as db_error:
            print(f"❌ Unexpected error: {type(db_error).__name__}: {db_error}")
            import traceback
            traceback.print_exc()
            # Ensure database connection is closed
            try:
                if cur:
                    cur.close()
                if conn:
                    conn.close()
            except:
                pass
            if 'embedding' in locals():
                del embedding
            if 'string_rep' in locals():
                del string_rep
            gc.collect()
            response = jsonify(
                {"status": "error", "message": f"Unexpected error: {str(db_error)}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        if row:
            distance = row[1]
            max_score_dist = PASSING_THRESHOLD_DISTANCE * 2
            raw_score = ((max_score_dist - distance) / max_score_dist) * 100
            score = round(max(0, min(100, raw_score)))

            print(
                f"📊 Verification result: Score {score}% (threshold: {PASSING_THRESHOLD_PERCENTAGE}%)")

            # Use percentage threshold instead of distance
            if score >= PASSING_THRESHOLD_PERCENTAGE:
                print(f"✅ Face verified! Score: {score}%")
                response = jsonify({
                    "status": "success",
                    "success": True,
                    "score": score,
                    "message": "Identity Verified",
                    "redirect": url_for('success_page')
                })
                response.headers.add('Access-Control-Allow-Origin', '*')
                return response
            else:
                print(
                    f"❌ Face mismatch. Score: {score}% (required: {PASSING_THRESHOLD_PERCENTAGE}%)")
                response = jsonify({
                    "status": "fail",
                    "success": False,
                    "score": score,
                    "message": "Face mismatch"
                })
                response.headers.add('Access-Control-Allow-Origin', '*')
                return response
        else:
            print("⚠️ No ID record found in database")
            response = jsonify(
                {"status": "error", "message": "No ID record found"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        # Clean up on error
        gc.collect()
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    """Health check endpoint for Flutter app"""
    response = jsonify({"status": "ok", "message": "Backend is running"})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Starting Flask Facial Recognition Server")
    print("=" * 50)
    print("📡 Server URL: http://0.0.0.0:5000")
    print("📱 Android Emulator: http://10.0.2.2:5000")
    print("📱 iOS Simulator: http://localhost:5000")
    print("🔍 Health Check: http://0.0.0.0:5000/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
