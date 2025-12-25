# Face Recognition Service using DeepFace
import os
import cv2
import numpy as np
import gc
import time
from deepface import DeepFace

from config import MODEL_NAME, MAX_IMAGE_SIZE, UPLOAD_FOLDER, PASSING_THRESHOLD_DISTANCE, PASSING_THRESHOLD_PERCENTAGE

# Haar cascade for face detection
_haar_cascade = None

# Temporary IC embedding storage (for registration flow)
_temp_ic_embedding = None


def store_temp_embedding(embedding):
    """Store IC embedding temporarily in memory for verification"""
    global _temp_ic_embedding
    _temp_ic_embedding = embedding
    print("📦 IC embedding stored in memory for verification")


def get_temp_embedding():
    """Retrieve temporarily stored IC embedding"""
    return _temp_ic_embedding


def clear_temp_embedding():
    """Clear temporary embedding after verification"""
    global _temp_ic_embedding
    _temp_ic_embedding = None
    print("🗑️ Temp embedding cleared")


def compare_embeddings(embedding1, embedding2):
    """Compare two embeddings and return (is_match, score, distance)"""
    import json
    
    if embedding1 is None or embedding2 is None:
        return False, 0, float('inf')
    
    # Handle string embeddings (from Supabase JSON)
    if isinstance(embedding1, str):
        try:
            embedding1 = json.loads(embedding1)
        except json.JSONDecodeError:
            print(f"⚠️ Failed to parse embedding1 as JSON")
            return False, 0, float('inf')
    
    if isinstance(embedding2, str):
        try:
            embedding2 = json.loads(embedding2)
        except json.JSONDecodeError:
            print(f"⚠️ Failed to parse embedding2 as JSON")
            return False, 0, float('inf')
    
    # Calculate Euclidean distance
    arr1 = np.array(embedding1, dtype=np.float64)
    arr2 = np.array(embedding2, dtype=np.float64)
    distance = np.linalg.norm(arr1 - arr2)
    
    # Calculate score (same formula as before)
    max_score_dist = PASSING_THRESHOLD_DISTANCE * 2
    raw_score = ((max_score_dist - distance) / max_score_dist) * 100
    score = round(max(0, min(100, raw_score)))
    
    is_match = score >= PASSING_THRESHOLD_PERCENTAGE
    
    print(f"📊 Comparison: Distance={distance:.2f}, Score={score}%, Match={is_match}")
    return is_match, score, distance


def warmup():
    """Warmup DeepFace model (call once on startup)"""
    print("⏳ Warming up DeepFace AI... (This runs once)")
    try:
        test_img = np.zeros((100, 100, 3), dtype=np.uint8)
        DeepFace.represent(
            img_path=test_img,
            model_name=MODEL_NAME,
            enforce_detection=False,
            detector_backend='opencv'
        )
        del test_img
        gc.collect()
        print("✅ AI Ready!")
        return True
    except Exception as e:
        print(f"⚠️ Warmup warning: {e}")
        return False


def get_haar_cascade():
    """Get or initialize Haar cascade classifier"""
    global _haar_cascade
    if _haar_cascade is None:
        cascade_path = os.path.join(os.path.dirname(__file__), 'haarcascade_frontalface_default.xml')
        if os.path.exists(cascade_path):
            _haar_cascade = cv2.CascadeClassifier(cascade_path)
        else:
            _haar_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
    return _haar_cascade


def resize_image(img_path_or_array, max_size=MAX_IMAGE_SIZE, min_size=320):
    """Resize image if too large, keeping it large enough for face detection"""
    if isinstance(img_path_or_array, str):
        img = cv2.imread(img_path_or_array)
    else:
        img = img_path_or_array.copy()

    if img is None:
        return img_path_or_array

    height, width = img.shape[:2]
    max_dim = max(height, width)
    min_dim = min(height, width)

    if max_dim > max_size:
        scale = max_size / max_dim
        new_width = int(width * scale)
        new_height = int(height * scale)
        if min(new_width, new_height) < min_size:
            scale = min_size / min_dim
            new_width = int(width * scale)
            new_height = int(height * scale)
        img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)

    return img


def detect_face(frame):
    """Detect faces in frame using Haar cascade, returns list of face coordinates"""
    haar_cascade = get_haar_cascade()
    if haar_cascade.empty():
        return []

    gray_img = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Attempt 1: Lenient
    min_face_size = max(15, min(frame.shape[1], frame.shape[0]) // 20)
    faces = haar_cascade.detectMultiScale(
        gray_img,
        scaleFactor=1.05,
        minNeighbors=1,
        minSize=(min_face_size, min_face_size),
        flags=cv2.CASCADE_SCALE_IMAGE
    )

    # Attempt 2: More lenient
    if len(faces) == 0:
        min_face_size = max(10, min(frame.shape[1], frame.shape[0]) // 30)
        faces = haar_cascade.detectMultiScale(
            gray_img,
            scaleFactor=1.03,
            minNeighbors=1,
            minSize=(min_face_size, min_face_size),
            flags=cv2.CASCADE_SCALE_IMAGE
        )

    del gray_img
    gc.collect()
    return faces


def crop_face(frame, face_coords, padding=50):
    """Crop face region from frame with padding, returns file path to cropped image"""
    x, y, w, h = face_coords
    
    # Add padding
    x = max(0, x - padding)
    y = max(0, y - padding)
    w = min(frame.shape[1] - x, w + padding * 2)
    h = min(frame.shape[0] - y, h + padding * 2)

    # Validate
    if x < 0 or y < 0 or x + w > frame.shape[1] or y + h > frame.shape[0]:
        raise ValueError(f"Invalid crop: x={x}, y={y}, w={w}, h={h}")

    face_crop = frame[y:y+h, x:x+w]
    crop_path = os.path.join(UPLOAD_FOLDER, f"face_crop_{int(time.time())}.jpg")
    cv2.imwrite(crop_path, face_crop)
    
    del face_crop
    gc.collect()
    return crop_path


def generate_embedding(img_input):
    """Generate 512-dimensional face embedding from image"""
    temp_path = None
    try:
        if isinstance(img_input, np.ndarray):
            temp_path = os.path.join(UPLOAD_FOLDER, f"temp_embed_{int(time.time())}.jpg")
            if len(img_input.shape) == 3 and img_input.shape[2] == 3:
                bgr_img = cv2.cvtColor(img_input, cv2.COLOR_RGB2BGR)
            else:
                bgr_img = img_input
            cv2.imwrite(temp_path, bgr_img)
            processed_img = temp_path
        else:
            processed_img = resize_image(img_input)

        print("🔍 Generating face embedding...")
        embedding_obj = DeepFace.represent(
            img_path=processed_img,
            model_name=MODEL_NAME,
            enforce_detection=False,
            detector_backend='opencv'
        )

        embedding = embedding_obj[0]["embedding"]
        print(f"✅ Embedding generated (length: {len(embedding)})")

        # Cleanup temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

        # Clear TensorFlow/Keras memory to prevent buildup
        try:
            from tensorflow.keras import backend as K
            K.clear_session()
        except:
            pass
        
        gc.collect()
        return embedding

    except Exception as e:
        print(f"Error generating embedding: {e}")
        import traceback
        traceback.print_exc()
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        gc.collect()
        raise


def process_frame_for_embedding(frame):
    """Process a video frame and return face embedding or None"""
    # Resize if needed
    if max(frame.shape[:2]) > MAX_IMAGE_SIZE:
        frame = resize_image(frame)

    # Detect faces
    faces = detect_face(frame)

    if len(faces) == 0:
        # Use entire frame, let DeepFace detect internally
        rgb_face = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        return generate_embedding(rgb_face)
    else:
        # Get largest face
        largest_face = max(faces, key=lambda f: f[2] * f[3])
        crop_path = crop_face(frame, largest_face)
        try:
            embedding = generate_embedding(crop_path)
            return embedding
        finally:
            if os.path.exists(crop_path):
                try:
                    os.remove(crop_path)
                except:
                    pass
