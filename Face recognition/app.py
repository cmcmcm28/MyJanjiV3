# Flask Backend for Face Recognition
# This file contains only routes - logic is in service modules

import os
import base64
import time
import gc
import numpy as np
import cv2
from flask import Flask, render_template, request, jsonify, url_for
from flask_cors import CORS

# Import from our modules
from config import UPLOAD_FOLDER, PASSING_THRESHOLD_DISTANCE, PASSING_THRESHOLD_PERCENTAGE
import ocr_service
import face_service
import contract_service

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Warmup AI models on startup
face_service.warmup()


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

    filepath = os.path.join(UPLOAD_FOLDER, f"ic_extract_{int(time.time())}.jpg")
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
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json.get('image', '')
        if not data:
            response = jsonify({"status": "error", "message": "No image data provided"})
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
            response = jsonify({"status": "error", "message": f"Failed to decode: {decode_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        np_arr = np.frombuffer(decoded_image, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        del decoded_image, np_arr
        gc.collect()

        if frame is None:
            response = jsonify({"status": "error", "message": "Failed to decode image"})
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
            response = jsonify({"status": "error", "message": f"Failed to process face: {embed_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        # Get stored IC embedding from memory
        ic_embedding = face_service.get_temp_embedding()
        
        if ic_embedding is None:
            del camera_embedding
            gc.collect()
            response = jsonify({"status": "error", "message": "No IC record found. Please upload IC first."})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Compare embeddings directly (no DB lookup)
        is_match, score, distance = face_service.compare_embeddings(ic_embedding, camera_embedding)
        
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
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify({"status": "error", "message": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        image_data = data.get('image', '')
        stored_embedding = data.get('face_embedding', None)

        if not image_data:
            response = jsonify({"status": "error", "message": "No image data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        if not stored_embedding:
            response = jsonify({"status": "error", "message": "No stored embedding provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        try:
            decoded_image = base64.b64decode(image_data)
        except Exception as decode_error:
            response = jsonify({"status": "error", "message": f"Failed to decode: {decode_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        np_arr = np.frombuffer(decoded_image, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        del decoded_image, np_arr
        gc.collect()

        if frame is None:
            response = jsonify({"status": "error", "message": "Failed to decode image"})
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
            response = jsonify({"status": "error", "message": f"Failed to process face: {embed_error}"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        # Compare with stored Supabase embedding
        is_match, score, distance = face_service.compare_embeddings(stored_embedding, camera_embedding)
        
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
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'POST')
            return response

        data = request.json
        if not data:
            response = jsonify({"status": "error", "message": "No data provided"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        template_name = data.get('template_name')
        placeholders = data.get('placeholders', {})
        contract_id = data.get('contract_id')

        if not template_name:
            response = jsonify({"status": "error", "message": "template_name is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        if not contract_id:
            response = jsonify({"status": "error", "message": "contract_id is required"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        print(f"📄 Generating contract: {template_name} for {contract_id}")
        result = contract_service.generate_contract(template_name, placeholders, contract_id)

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


@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    """Health check endpoint"""
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
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False, threaded=False)
