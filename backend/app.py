# Flask Backend for Face Recognition
# This file contains only routes - logic is in service modules

import os
import base64
import time
import gc
import numpy as np
# ... (imports)
from config import UPLOAD_FOLDER, PASSING_THRESHOLD_DISTANCE, PASSING_THRESHOLD_PERCENTAGE
import contract_service
import ai_annotation_service
import pdf_highlight_service

from flask import Flask, render_template, request, jsonify, url_for, make_response
from flask_cors import CORS

# Optional dependencies (bypass if cv2/numpy fails on Python 3.14)
try:
    import cv2
    import ocr_service
    import face_service
    AI_AVAILABLE = True
    # Warmup AI models on startup
    face_service.warmup()
except ImportError as e:
    print(f"⚠️ AI Services unavailable (cv2/numpy missing): {e}")
    AI_AVAILABLE = False
    cv2 = None
    ocr_service = None
    face_service = None

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
# ...


# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload_ic', methods=['POST'])
def upload_ic():
    """Upload IC image for registration"""
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
        # Extract IC details using OCR service
        ocr_data = ocr_service.extract_ic_details(filepath)

        # Generate face embedding and store in memory (NOT in DB yet)
        embedding = face_service.generate_embedding(filepath)

        # Store in memory for verification comparison
        face_service.store_temp_embedding(embedding)

        # Return embedding to frontend for later storage in users table
        embedding_list = list(embedding) if embedding else None
        del embedding
        gc.collect()

        print("📦 IC processed - awaiting face verification")

        response = jsonify({
            "status": "success",
            "message": "IC uploaded - proceed to face verification",
            "redirect": url_for('verify_page'),
            "ocr_data": ocr_data,
            "face_embedding": embedding_list
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error uploading IC: {e}")
        import traceback
        traceback.print_exc()
        gc.collect()
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
        ocr_data = ocr_service.extract_ic_details(filepath)

        # Clean up temp file
        if os.path.exists(filepath):
            os.remove(filepath)

        response = jsonify({"status": "success", "data": ocr_data})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error extracting IC: {e}")
        import traceback
        traceback.print_exc()
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
    """Process webcam frame for face verification"""
    try:
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

        # Decode base64 image
        if ',' in data:
            image_data = data.split(',')[1]
        else:
            image_data = data

        try:
            decoded_image = base64.b64decode(image_data)
        except Exception as decode_error:
            response = jsonify(
                {"status": "error", "message": f"Failed to decode: {decode_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        np_arr = np.frombuffer(decoded_image, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        del decoded_image, np_arr
        gc.collect()

        if frame is None:
            response = jsonify(
                {"status": "error", "message": "Failed to decode image"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Generate embedding from frame using face_service
        try:
            camera_embedding = face_service.process_frame_for_embedding(frame)
            del frame
            gc.collect()
        except Exception as embed_error:
            if 'frame' in locals():
                del frame
            gc.collect()
            response = jsonify(
                {"status": "error", "message": f"Failed to process face: {embed_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        # Get stored IC embedding from memory
        ic_embedding = face_service.get_temp_embedding()

        if ic_embedding is None:
            del camera_embedding
            gc.collect()
            response = jsonify(
                {"status": "error", "message": "No IC record found. Please upload IC first."})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Compare embeddings directly (no DB lookup)
        is_match, score, distance = face_service.compare_embeddings(
            ic_embedding, camera_embedding)

        del camera_embedding
        gc.collect()

        if is_match:
            print(f"✅ Face verified! Score: {score}%")
            response = jsonify({
                "status": "success",
                "success": True,
                "score": score,
                "message": "Identity Verified",
                "redirect": url_for('success_page')
            })
        else:
            print(f"❌ Face mismatch. Score: {score}%")
            response = jsonify({
                "status": "fail",
                "success": False,
                "score": score,
                "message": "Face mismatch"
            })

        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        gc.collect()
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/verify_login', methods=['POST', 'OPTIONS'])
def verify_login():
    """
    Login verification endpoint.
    Receives camera frame + stored face_embedding from Supabase.
    Compares them and returns match/mismatch.
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add(
                'Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify(
                {"status": "error", "message": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        image_data = data.get('image', '')
        stored_embedding = data.get('face_embedding', None)

        if not image_data:
            response = jsonify(
                {"status": "error", "message": "No image data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        if not stored_embedding:
            response = jsonify(
                {"status": "error", "message": "No stored embedding provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        try:
            decoded_image = base64.b64decode(image_data)
        except Exception as decode_error:
            response = jsonify(
                {"status": "error", "message": f"Failed to decode: {decode_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        np_arr = np.frombuffer(decoded_image, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        del decoded_image, np_arr
        gc.collect()

        if frame is None:
            response = jsonify(
                {"status": "error", "message": "Failed to decode image"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Generate embedding from camera frame
        try:
            camera_embedding = face_service.process_frame_for_embedding(frame)
            del frame
            gc.collect()
        except Exception as embed_error:
            if 'frame' in locals():
                del frame
            gc.collect()
            response = jsonify(
                {"status": "error", "message": f"Failed to process face: {embed_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        # Compare with stored Supabase embedding
        is_match, score, distance = face_service.compare_embeddings(
            stored_embedding, camera_embedding)

        del camera_embedding
        gc.collect()

        if is_match:
            print(f"✅ Login verified! Score: {score}%")
            response = jsonify({
                "status": "success",
                "success": True,
                "score": score,
                "message": "Identity Verified"
            })
        else:
            print(f"❌ Login mismatch. Score: {score}%")
            response = jsonify({
                "status": "fail",
                "success": False,
                "score": score,
                "message": "Face mismatch"
            })

        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error in verify_login: {e}")
        import traceback
        traceback.print_exc()
        gc.collect()
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/identify_face', methods=['POST', 'OPTIONS'])
def identify_face():
    """
    Identify user from face in a SINGLE API call.
    This replaces the frontend loop through all users.

    Receives: image (base64)
    Returns: matched user info or error
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add(
                'Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify(
                {"success": False, "message": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        image_data = data.get('image', '')
        if not image_data:
            response = jsonify(
                {"success": False, "message": "No image data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        try:
            decoded_image = base64.b64decode(image_data)
        except Exception as decode_error:
            response = jsonify(
                {"success": False, "message": f"Failed to decode image: {decode_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        np_arr = np.frombuffer(decoded_image, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        del decoded_image, np_arr
        gc.collect()

        if frame is None:
            response = jsonify(
                {"success": False, "message": "Failed to decode image"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Generate embedding from camera frame
        try:
            camera_embedding = face_service.process_frame_for_embedding(frame)
            del frame
            gc.collect()
        except Exception as embed_error:
            if 'frame' in locals():
                del frame
            gc.collect()
            response = jsonify(
                {"success": False, "message": f"No face detected: {embed_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        if camera_embedding is None:
            response = jsonify(
                {"success": False, "message": "No face detected in image"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Fetch all users with face embeddings from Supabase
        try:
            supabase = contract_service.get_supabase_client()
            result = supabase.table('users').select(
                'user_id, name, email, phone, nfc_chip_id, face_embedding').not_.is_('face_embedding', 'null').execute()
            users = result.data if result.data else []
            print(
                f"🔍 Checking against {len(users)} users with face embeddings")
        except Exception as db_error:
            print(f"❌ Database error: {db_error}")
            response = jsonify(
                {"success": False, "message": f"Database error: {db_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        # Compare against all user embeddings and find best match
        best_match = None
        best_score = 0
        best_distance = float('inf')

        for user in users:
            stored_embedding = user.get('face_embedding')
            if not stored_embedding:
                continue

            is_match, score, distance = face_service.compare_embeddings(
                stored_embedding, camera_embedding
            )

            # Track best match (even if below threshold, for debugging)
            if distance < best_distance:
                best_distance = distance
                best_score = score
                if is_match:
                    best_match = user

        del camera_embedding
        gc.collect()

        if best_match:
            print(
                f"✅ Face identified: {best_match['name']} (Score: {best_score}%)")
            response = jsonify({
                "success": True,
                "user": {
                    "id": best_match['user_id'],
                    "name": best_match['name'],
                    "email": best_match.get('email', ''),
                    "phone": best_match.get('phone', ''),
                    "nfcChipId": best_match.get('nfc_chip_id', ''),
                },
                "score": best_score,
                "message": f"Welcome back, {best_match['name']}!"
            })
        else:
            print(f"❌ No matching face found. Best score: {best_score}%")
            response = jsonify({
                "success": False,
                "message": "Face not recognized. Please try again.",
                "best_score": best_score
            })

        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error in identify_face: {e}")
        import traceback
        traceback.print_exc()
        gc.collect()
        response = jsonify({"success": False, "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/generate_contract', methods=['POST', 'OPTIONS'])
def generate_contract():
    """
    Generate PDF contract from template.
    Expects: template_name, placeholders (dict), contract_id
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add(
                'Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify(
                {"status": "error", "message": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        template_name = data.get('template_name')
        placeholders = data.get('placeholders', {})
        contract_id = data.get('contract_id')

        if not template_name:
            response = jsonify(
                {"status": "error", "message": "template_name is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        if not contract_id:
            response = jsonify(
                {"status": "error", "message": "contract_id is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        print(f"📄 Generating contract: {template_name} for {contract_id}")
        result = contract_service.generate_contract(
            template_name, placeholders, contract_id)

        if result['success']:
            response = jsonify({
                "status": "success",
                "pdf_url": result['pdf_url'],
                "contract_id": result['contract_id']
            })
        else:
            response = jsonify({
                "status": "error",
                "message": result.get('error', 'Contract generation failed')
            })
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error generating contract: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/preview_contract', methods=['POST', 'OPTIONS'])
def preview_contract():
    """
    Generate PDF preview from template (returns PDF blob, doesn't upload).
    Expects: template_name, placeholders (dict)
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add(
                'Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify(
                {"status": "error", "message": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        template_name = data.get('template_name')
        placeholders = data.get('placeholders', {})

        if not template_name:
            response = jsonify(
                {"status": "error", "message": "template_name is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        print(f"Previewing contract: {template_name}")

        # Use preview_contract which includes placeholder mapping
        filled_path = contract_service.preview_contract(
            template_name, placeholders)

        # Convert to PDF
        pdf_path = contract_service.convert_to_pdf(filled_path)

        # Read PDF and return as response
        with open(pdf_path, 'rb') as f:
            pdf_data = f.read()

        # Cleanup temp files
        doc_path = filled_path.replace('_filled.docx', '.docx')
        contract_service.cleanup_temp_files([doc_path, filled_path, pdf_path])

        # Return PDF as blob
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'inline; filename=preview.pdf'
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error previewing contract: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/prepare_contract', methods=['POST', 'OPTIONS'])
def prepare_contract():
    """
    Prepare contract by generating PDF and storing in temp folder.
    Call this when user fills form and clicks Next.
    Returns prepare_id to retrieve the PDF later.
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add(
                'Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify(
                {"status": "error", "message": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        template_name = data.get('template_name')
        placeholders = data.get('placeholders', {})

        if not template_name:
            response = jsonify(
                {"status": "error", "message": "template_name is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        print(f"📋 Preparing contract: {template_name}")

        result = contract_service.prepare_contract(template_name, placeholders)

        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error preparing contract: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/get_prepared_contract/<prepare_id>', methods=['GET', 'OPTIONS'])
def get_prepared_contract(prepare_id):
    """
    Retrieve a prepared contract PDF by its prepare_id.
    Returns the PDF file as blob.
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add(
                'Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'GET')
            return response

        pdf_path = contract_service.get_prepared_contract(prepare_id)

        if not pdf_path:
            response = jsonify(
                {"status": "error", "message": "Prepared contract not found"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 404

        print(f"📄 Serving prepared contract: {prepare_id}")

        with open(pdf_path, 'rb') as f:
            pdf_data = f.read()

        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'inline; filename=contract.pdf'
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error getting prepared contract: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/create_contract', methods=['POST', 'OPTIONS'])
def create_contract():
    """
    Finalize contract creation:
    - Upload PDF to storage under user_id folder
    - Create contract record in database
    Expects: prepare_id, user_id, acceptee_id, contract_name, contract_topic, 
             template_type, form_data, creator_signature, verification flags, due_date
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add(
                'Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify(
                {"status": "error", "message": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Required fields
        prepare_id = data.get('prepare_id')
        user_id = data.get('user_id')
        acceptee_id = data.get('acceptee_id')
        contract_name = data.get('contract_name', 'Untitled Contract')
        contract_topic = data.get('contract_topic', '')
        template_type = data.get('template_type')
        form_data = data.get('form_data', {})

        # Optional fields
        creator_signature = data.get('creator_signature')
        creator_name = data.get('creator_name')
        creator_ic = data.get('creator_ic')
        creator_nfc_verified = data.get('creator_nfc_verified', False)
        creator_face_verified = data.get('creator_face_verified', False)
        due_date = data.get('due_date')

        if not prepare_id:
            response = jsonify(
                {"status": "error", "message": "prepare_id is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        if not user_id:
            response = jsonify(
                {"status": "error", "message": "user_id is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        if not acceptee_id:
            response = jsonify(
                {"status": "error", "message": "acceptee_id is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        print(f"📝 Creating contract from prepared: {prepare_id}")

        result = contract_service.finalize_contract(
            prepare_id=prepare_id,
            user_id=user_id,
            acceptee_id=acceptee_id,
            contract_name=contract_name,
            contract_topic=contract_topic,
            template_type=template_type,
            form_data=form_data,
            creator_signature=creator_signature,
            creator_name=creator_name,
            creator_ic=creator_ic,
            creator_nfc_verified=creator_nfc_verified,
            creator_face_verified=creator_face_verified,
            due_date=due_date
        )

        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error creating contract: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    """Health check endpoint"""
    response = jsonify({"status": "ok", "message": "Backend is running"})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/sign_contract', methods=['POST', 'OPTIONS'])
def sign_contract():
    """
    Sign contract as acceptor:
    - Re-generate PDF with acceptor signature and details
    - Overwrite existing PDF in storage
    - Update contract status to 'Ongoing'
    Expects: contract_id, acceptor_signature, acceptor_name, acceptor_ic, verification flags
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add(
                'Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify(
                {"status": "error", "message": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Required fields
        contract_id = data.get('contract_id')
        acceptor_signature = data.get('acceptor_signature')
        acceptor_name = data.get('acceptor_name')
        acceptor_ic = data.get('acceptor_ic')

        # Optional verification flags
        acceptor_nfc_verified = data.get('acceptor_nfc_verified', False)
        acceptor_face_verified = data.get('acceptor_face_verified', False)

        if not contract_id:
            response = jsonify(
                {"status": "error", "message": "contract_id is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        if not acceptor_signature:
            response = jsonify(
                {"status": "error", "message": "acceptor_signature is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        print(f"✍️ Signing contract as acceptor: {contract_id}")

        result = contract_service.sign_contract_acceptor(
            contract_id=contract_id,
            acceptor_signature_base64=acceptor_signature,
            acceptor_name=acceptor_name or 'Unknown',
            acceptor_ic=acceptor_ic or 'Unknown',
            acceptor_nfc_verified=acceptor_nfc_verified,
            acceptor_face_verified=acceptor_face_verified
        )

        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error signing contract: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/admin/clear_cache', methods=['POST'])
def clear_template_cache():
    """Admin endpoint to clear template cache (forces re-download on next use)"""
    try:
        contract_service.clear_template_cache()
        response = jsonify({
            "status": "success",
            "message": "Template cache cleared successfully"
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    except Exception as e:
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/admin/cache_status', methods=['GET'])
def get_cache_status():
    """Admin endpoint to check template cache status"""
    try:
        cache_info = []
        for path, (data, timestamp) in contract_service.TEMPLATE_CACHE.items():
            age = time.time() - timestamp
            cache_info.append({
                "template": path,
                "size_bytes": len(data),
                "age_seconds": round(age, 1),
                "expires_in": round(contract_service.CACHE_EXPIRY_SECONDS - age, 1)
            })

        response = jsonify({
            "status": "success",
            "cached_templates": len(cache_info),
            "cache_expiry_seconds": contract_service.CACHE_EXPIRY_SECONDS,
            "templates": cache_info
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    except Exception as e:
        response = jsonify({"status": "error", "message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


# --- AI ANNOTATION ROUTES ---

@app.route('/analyze_contract', methods=['POST', 'OPTIONS'])
def analyze_contract():
    """
    Analyze contract text using AI to extract important clauses.
    Expects: agreement_text, contract_id (optional)
    Returns: annotations list with highlighted_text, summary, importance, category, indices
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify({"success": False, "error": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        agreement_text = data.get('agreement_text', '')
        contract_id = data.get('contract_id', None)

        if not agreement_text or len(agreement_text.strip()) < 50:
            response = jsonify({
                "success": False,
                "error": "Agreement text is too short (minimum 50 characters)"
            })
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        print(f"🤖 Analyzing contract with AI ({len(agreement_text)} chars)")
        if contract_id:
            print(f"   Contract ID: {contract_id}")

        # Call AI annotation service
        result = ai_annotation_service.extract_contract_annotations(agreement_text)

        if result['success']:
            print(f"✅ AI analysis complete: {len(result['annotations'])} annotations")
        else:
            print(f"❌ AI analysis failed: {result.get('error')}")

        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error analyzing contract: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({"success": False, "error": str(e), "annotations": []})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/get_agreement_text/<contract_id>', methods=['GET', 'OPTIONS'])
def get_agreement_text(contract_id):
    """
    Get the plain text version of a contract for AI analysis.
    Fetches from database form_data and generates text representation.
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'GET')
            return response

        # Get Supabase client
        supabase = contract_service.get_supabase_client()
        if not supabase:
            response = jsonify({"success": False, "error": "Database not configured"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        # Fetch contract from database
        result = supabase.table('contracts').select('*').eq('contract_id', contract_id).execute()

        if not result.data:
            response = jsonify({"success": False, "error": "Contract not found"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 404

        contract = result.data[0]
        form_data = contract.get('form_data', {})
        template_type = contract.get('template_type', 'GENERAL')

        # Generate agreement text from form data
        agreement_text = generate_agreement_text(template_type, form_data, contract)

        response = jsonify({
            "success": True,
            "agreement_text": agreement_text,
            "contract_id": contract_id,
            "template_type": template_type
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error getting agreement text: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({"success": False, "error": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


def generate_agreement_text(template_type, form_data, contract):
    """
    Generate plain text representation of a contract for AI analysis.
    """
    if not form_data:
        form_data = {}

    contract_name = contract.get('contract_name', 'Agreement')
    
    # Build a structured text representation
    lines = [
        f"CONTRACT: {contract_name}",
        f"Template Type: {template_type}",
        "",
        "PARTIES:",
    ]
    
    # Add party information
    creator_name = form_data.get('creator_name') or form_data.get('creatorName', 'Party A')
    acceptee_name = form_data.get('acceptee_name') or form_data.get('accepteeName', 'Party B')
    lines.append(f"- Creator/Lender: {creator_name}")
    lines.append(f"- Acceptee/Borrower: {acceptee_name}")
    lines.append("")
    
    # Add form data as contract terms
    lines.append("TERMS AND CONDITIONS:")
    lines.append("")
    
    # Common fields to extract with meaningful labels
    field_labels = {
        'amount': 'Loan/Payment Amount',
        'loanAmount': 'Loan Amount',
        'rental_fee': 'Rental Fee',
        'rentalFee': 'Rental Fee',
        'deposit_amount': 'Deposit Amount',
        'depositAmount': 'Deposit Amount',
        'payment_amount': 'Payment Amount',
        'paymentAmount': 'Payment Amount',
        'start_date': 'Start Date',
        'startDate': 'Start Date',
        'end_date': 'End Date',
        'endDate': 'End Date',
        'due_date': 'Due Date',
        'dueDate': 'Due Date',
        'payment_terms': 'Payment Terms',
        'paymentTerms': 'Payment Terms',
        'payment_frequency': 'Payment Frequency',
        'paymentFrequency': 'Payment Frequency',
        'interest_rate': 'Interest Rate',
        'interestRate': 'Interest Rate',
        'termination_notice_days': 'Termination Notice Period',
        'noticePeriodDays': 'Notice Period (Days)',
        'replacement_value': 'Replacement Value',
        'replacementValue': 'Replacement Value',
        'equipment_list': 'Equipment/Items',
        'equipmentList': 'Equipment/Items',
        'vehicle_list': 'Vehicles',
        'vehicleList': 'Vehicles',
        'service_description': 'Service Description',
        'scopeOfWork': 'Scope of Work',
        'terms': 'Additional Terms',
        'additionalTerms': 'Additional Terms',
    }
    
    for key, label in field_labels.items():
        if key in form_data and form_data[key]:
            value = form_data[key]
            if key in ['amount', 'loanAmount', 'rental_fee', 'rentalFee', 'deposit_amount', 
                       'depositAmount', 'payment_amount', 'paymentAmount', 'replacement_value', 'replacementValue']:
                lines.append(f"- {label}: RM {value}")
            else:
                lines.append(f"- {label}: {value}")
    
    # Add any remaining form data not captured above
    lines.append("")
    lines.append("STANDARD CLAUSES:")
    lines.append("")
    
    # Add template-specific standard clauses
    if template_type in ['FRIENDLY_LOAN', 'MONEY_LEND']:
        lines.extend([
            "1. REPAYMENT: The Borrower agrees to repay the full loan amount according to the terms specified above.",
            "",
            "2. LATE PAYMENT: In the event of late payment, a penalty fee may be applied as agreed by both parties.",
            "",
            "3. DEFAULT: If the Borrower fails to make payment for an extended period, the Lender reserves the right to take legal action to recover the outstanding amount.",
            "",
            "4. TERMINATION: Either party may terminate this agreement with written notice. Upon termination, any outstanding balance becomes immediately due.",
        ])
    elif template_type in ['ITEM_BORROW', 'VEHICLE_USE']:
        lines.extend([
            "1. CONDITION: The Borrower acknowledges receiving the items/vehicle in good condition and agrees to return them in the same condition.",
            "",
            "2. LIABILITY: The Borrower is responsible for any damage, loss, or theft of the borrowed items during the borrowing period.",
            "",
            "3. RETURN: Items must be returned by the agreed end date. Late returns may incur additional fees.",
            "",
            "4. INSURANCE: The Borrower is responsible for maintaining appropriate insurance coverage during the borrowing period.",
        ])
    elif template_type in ['FREELANCE_JOB', 'SERVICE']:
        lines.extend([
            "1. SCOPE OF WORK: The Contractor agrees to perform the services as described above to the satisfaction of the Client.",
            "",
            "2. PAYMENT: Payment shall be made according to the terms specified. Late payment may incur additional charges.",
            "",
            "3. INTELLECTUAL PROPERTY: All work product created under this agreement shall belong to the Client upon full payment.",
            "",
            "4. CONFIDENTIALITY: The Contractor agrees to maintain confidentiality of all proprietary information.",
            "",
            "5. TERMINATION: Either party may terminate this agreement with the notice period specified above.",
        ])
    else:
        lines.extend([
            "1. AGREEMENT: Both parties agree to the terms and conditions stated in this contract.",
            "",
            "2. OBLIGATIONS: Each party shall fulfill their respective obligations as specified.",
            "",
            "3. DISPUTE RESOLUTION: Any disputes shall be resolved through mutual discussion or mediation before legal action.",
            "",
            "4. GOVERNING LAW: This agreement is governed by the laws of Malaysia.",
        ])
    
    lines.append("")
    lines.append("SIGNATURES:")
    lines.append("By signing this document, both parties acknowledge that they have read, understood, and agree to be bound by all terms and conditions herein.")
    
    return "\n".join(lines)


@app.route('/get_contract_text', methods=['POST', 'OPTIONS'])
def get_contract_text():
    """
    Extract plain text from a filled DOCX template for AI analysis.
    Uses the actual Word template with placeholders filled.
    Expects: template_name, placeholders
    Returns: { success: true, text: "...", character_count: 1234 }
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify({"success": False, "error": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        template_name = data.get('template_name')
        placeholders = data.get('placeholders', {})

        if not template_name:
            response = jsonify({"success": False, "error": "template_name is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        print(f"📄 Extracting text from DOCX: {template_name}")

        # Use the new extract_contract_text function
        result = contract_service.extract_contract_text(template_name, placeholders)

        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error extracting contract text: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({"success": False, "error": str(e), "text": ""})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/get_highlighted_pdf', methods=['POST', 'OPTIONS'])
def get_highlighted_pdf():
    """
    Generate a PDF with AI-based highlight annotations.
    Expects: template_name, placeholders, annotations (optional)
    Returns: PDF blob with highlights
    """
    try:
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify({"success": False, "error": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        template_name = data.get('template_name')
        placeholders = data.get('placeholders', {})
        annotations = data.get('annotations', [])

        if not template_name:
            response = jsonify({"success": False, "error": "template_name is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        print(f"📄 Generating highlighted PDF for: {template_name}")
        print(f"   Received {len(annotations)} annotations from frontend")

        # If no annotations provided, generate them via AI
        if not annotations:
            text_result = contract_service.extract_contract_text(template_name, placeholders)
            if text_result.get('success') and text_result.get('text'):
                ai_result = ai_annotation_service.extract_contract_annotations(text_result['text'])
                if ai_result.get('success'):
                    annotations = ai_result.get('annotations', [])
                    print(f"✅ Generated {len(annotations)} AI annotations")
        
        # Debug: Show first annotation structure
        if annotations:
            print(f"   First annotation keys: {annotations[0].keys() if annotations else 'none'}")
            print(f"   First highlighted_text: '{annotations[0].get('highlighted_text', '')[:50]}...'")

        # Generate highlighted PDF
        result = pdf_highlight_service.create_highlighted_pdf_preview(
            template_name, placeholders, annotations
        )

        if not result.get('success'):
            response = jsonify({"success": False, "error": result.get('error', 'Failed to create PDF')})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        pdf_path = result.get('pdf_path')
        if not pdf_path or not os.path.exists(pdf_path):
            response = jsonify({"success": False, "error": "PDF file not found"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        # Return PDF blob
        with open(pdf_path, 'rb') as f:
            pdf_data = f.read()

        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'inline; filename=highlighted_preview.pdf'
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Expose-Headers', 'X-Annotations')
        
        # Include annotations with page numbers in header
        annotations_with_pages = result.get('annotations_with_pages', [])
        # Send only essential info to keep header small
        page_info = [{'page': a.get('page_number'), 'found': a.get('found', False)} for a in annotations_with_pages]
        import json
        response.headers['X-Annotations'] = json.dumps(page_info)
        
        # Cleanup
        try:
            if result.get('original_path') and os.path.exists(result.get('original_path')):
                os.remove(result.get('original_path'))
            if pdf_path and os.path.exists(pdf_path):
                os.remove(pdf_path)
        except:
            pass
        
        print(f"✅ Returning highlighted PDF ({len(pdf_data)} bytes, {result.get('highlights_added', 0)} highlights)")
        return response

    except Exception as e:
        print(f"Error generating highlighted PDF: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({"success": False, "error": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Starting Flask Facial Recognition Server")
    print("=" * 50)
    print("📡 Server URL: http://0.0.0.0:5000")
    print("📱 Android Emulator: http://10.0.2.2:5000")
    print("📱 iOS Simulator: http://localhost:5000")
    print("🔍 Health Check: http://0.0.0.0:5000/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True,
            use_reloader=False, threaded=False)
