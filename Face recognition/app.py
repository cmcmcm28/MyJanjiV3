import os
import cv2
import numpy as np
import psycopg2
import base64
import time
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
from deepface import DeepFace

app = Flask(__name__)
# Enable CORS for Flutter app
CORS(app, resources={r"/*": {"origins": "*"}})

# --- CONFIGURATION ---
# Replace with your actual URI from environment variable
# Set DB_URI environment variable before running: export DB_URI="your_connection_string"
# IMPORTANT: Never commit database credentials to version control!
DB_URI = os.getenv("DB_URI")
if not DB_URI:
    raise ValueError("DB_URI environment variable is required. Please set it before running the application.")
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
MODEL_NAME = "Facenet512"
PASSING_THRESHOLD_DISTANCE = 20.0

# --- AI WARMUP ---
print("⏳ Warming up DeepFace AI... (This runs once)")
try:
    DeepFace.represent(img_path=np.zeros((100, 100, 3), np.uint8),
                       model_name=MODEL_NAME, enforce_detection=False)
    print("✅ AI Ready!")
except:
    pass


def get_db_connection():
    return psycopg2.connect(DB_URI)


def generate_embedding(img_input):
    embedding_obj = DeepFace.represent(
        img_path=img_input,
        model_name=MODEL_NAME,
        enforce_detection=False
    )
    return embedding_obj[0]["embedding"]

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
        embedding = generate_embedding(filepath)
        conn = get_db_connection()
        cur = conn.cursor()

        # Reset DB for single-user session
        cur.execute("DELETE FROM pictures;")
        cur.execute("INSERT INTO pictures (picture, embedding) VALUES (%s, %s)",
                    ("user_ic.jpg", embedding))
        conn.commit()
        conn.close()
        print("✅ New IC Registered!")

        # Return JSON with CORS headers
        response = jsonify(
            {"status": "success", "message": "IC uploaded successfully", "redirect": url_for('verify_page')})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error uploading IC: {e}")
        import traceback
        traceback.print_exc()
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

        if frame is None:
            response = jsonify(
                {"status": "error", "message": "Failed to decode image"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400

        # Use local haarcascade file if available, otherwise use OpenCV's built-in
        cascade_path = os.path.join(os.path.dirname(
            __file__), 'haarcascade_frontalface_default.xml')
        if os.path.exists(cascade_path):
            haar_cascade = cv2.CascadeClassifier(cascade_path)
        else:
            haar_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

        if haar_cascade.empty():
            response = jsonify(
                {"status": "error", "message": "Failed to load face detection cascade"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500

        gray_img = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = haar_cascade.detectMultiScale(
            gray_img, 1.05, minNeighbors=2, minSize=(100, 100))

        if len(faces) == 0:
            response = jsonify(
                {"status": "error", "message": "No face detected"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response

        largest_face = max(faces, key=lambda f: f[2] * f[3])
        x, y, w, h = largest_face
        face_crop = frame[y:y+h, x:x+w]
        rgb_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)

        embedding = generate_embedding(rgb_face)

        conn = get_db_connection()
        cur = conn.cursor()
        string_rep = "[" + ",".join(str(x) for x in embedding) + "]"

        cur.execute("""
            SELECT picture, (embedding <-> %s) as distance 
            FROM pictures 
            ORDER BY embedding <-> %s ASC 
            LIMIT 1;
        """, (string_rep, string_rep))
        row = cur.fetchone()
        conn.close()

        if row:
            distance = row[1]
            max_score_dist = PASSING_THRESHOLD_DISTANCE * 2
            raw_score = ((max_score_dist - distance) / max_score_dist) * 100
            score = round(max(0, min(100, raw_score)))

            print(f"DEBUG: Distance: {distance:.2f} | Score: {score}%")

            if distance < PASSING_THRESHOLD_DISTANCE:
                response = jsonify({
                    "status": "success",
                    "score": score,
                    "message": "Identity Verified",
                    "redirect": url_for('success_page')
                })
                response.headers.add('Access-Control-Allow-Origin', '*')
                return response
            else:
                response = jsonify(
                    {"status": "fail", "score": score, "message": "Face mismatch"})
                response.headers.add('Access-Control-Allow-Origin', '*')
                return response
        else:
            response = jsonify(
                {"status": "error", "message": "No ID record found"})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
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
