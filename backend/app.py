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
        filled_path = contract_service.preview_contract(template_name, placeholders)

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
