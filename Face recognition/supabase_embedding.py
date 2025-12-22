"""
Face Embedding Comparison Tool
Compares face embeddings from IC image and live face image.
If match, stores embedding in Supabase.
Usage: python supabase_embedding.py <ic_image> <face_image>
"""

import os
import sys
import cv2
import numpy as np

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

from deepface import DeepFace
import requests

# --- CONFIGURATION ---
MODEL_NAME = "Facenet512"
PASSING_THRESHOLD_DISTANCE = 30.0  # Same as app.py
SUPABASE_URL = "https://umldjcyvmtjtjyyhspif.supabase.co"
SUPABASE_KEY = "sb_publishable_-pTAB3wbjcbHlVCmzYjKlg_KHN4VyqW"


def generate_embedding(image_path: str) -> list:
    """Generate face embedding from image file."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    h, w = img.shape[:2]
    if max(h, w) > 800:
        scale = 800 / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))
        temp_path = "temp_resized.jpg"
        cv2.imwrite(temp_path, img)
        image_path = temp_path
    
    result = DeepFace.represent(
        img_path=image_path,
        model_name=MODEL_NAME,
        enforce_detection=False,
        detector_backend='opencv'
    )
    
    embedding = result[0]["embedding"]
    return embedding


def calculate_distance(embedding1: list, embedding2: list) -> float:
    """Calculate Euclidean distance between two embeddings."""
    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)
    distance = np.linalg.norm(vec1 - vec2)
    return distance


def main():
    if len(sys.argv) < 3:
        print()
        print("╔══════════════════════════════════════════════════════════╗")
        print("║         FACE EMBEDDING COMPARISON TOOL                   ║")
        print("╚══════════════════════════════════════════════════════════╝")
        print()
        print("Usage: python supabase_embedding.py <ic_image> <face_image>")
        print("Example: python supabase_embedding.py uploads/user_ic.jpg uploads/face_crop.jpg")
        sys.exit(1)
    
    ic_image = sys.argv[1]
    face_image = sys.argv[2]
    
    if not os.path.exists(ic_image):
        print(f"❌ IC image not found: {ic_image}")
        sys.exit(1)
    if not os.path.exists(face_image):
        print(f"❌ Face image not found: {face_image}")
        sys.exit(1)
    
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║         FACE EMBEDDING COMPARISON TOOL                   ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()
    print(f"  📄 IC Image:   {ic_image}")
    print(f"  👤 Face Image: {face_image}")
    print()
    print("─" * 60)
    
    # Generate IC embedding
    print()
    print("  🔄 [1/2] Processing IC image...")
    ic_embedding = generate_embedding(ic_image)
    print(f"       ✅ Generated embedding (length: {len(ic_embedding)})")
    
    # Generate Face embedding
    print()
    print("  🔄 [2/2] Processing Face image...")
    face_embedding = generate_embedding(face_image)
    print(f"       ✅ Generated embedding (length: {len(face_embedding)})")
    
    # Calculate distance
    print()
    print("─" * 60)
    print()
    print("  📊 COMPARISON RESULTS")
    print()
    
    distance = calculate_distance(ic_embedding, face_embedding)
    
    # Calculate score (same logic as app.py)
    max_score_dist = PASSING_THRESHOLD_DISTANCE * 2
    raw_score = ((max_score_dist - distance) / max_score_dist) * 100
    score = round(max(0, min(100, raw_score)))
    
    print(f"       Distance:  {distance:.4f}")
    print(f"       Threshold: {PASSING_THRESHOLD_DISTANCE}")
    print(f"       Score:     {score}%")
    print()
    
    if distance < PASSING_THRESHOLD_DISTANCE:
        print("  ╔════════════════════════════════════════════════════════╗")
        print("  ║  ✅ MATCH - Identity Verified!                         ║")
        print("  ╚════════════════════════════════════════════════════════╝")
        print()
        print("  💾 Storing embedding to Supabase...")
        
        # Store IC embedding to Supabase
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        url = f"{SUPABASE_URL}/rest/v1/register_image"
        data = {"register_ic_embedding": ic_embedding}
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code in [200, 201]:
            print("       ✅ Embedding stored in Supabase!")
        else:
            print(f"       ❌ Error: {response.status_code} - {response.text}")
    else:
        print("  ╔════════════════════════════════════════════════════════╗")
        print("  ║  ❌ NO MATCH - Face mismatch                           ║")
        print("  ╚════════════════════════════════════════════════════════╝")
        print()
        print("  ⏸️  Embedding kept in memory only (not stored)")
    
    print()
    
    # Cleanup
    if os.path.exists("temp_resized.jpg"):
        os.remove("temp_resized.jpg")


if __name__ == "__main__":
    main()
