# Configuration Constants for Face Recognition Backend
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- DATABASE (Optional - using Supabase from frontend) ---
DB_URI = os.getenv("DB_URI", None)  # Optional, not required anymore

# --- FILE STORAGE ---
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- FACE RECOGNITION ---
MODEL_NAME = "Facenet512"
PASSING_THRESHOLD_DISTANCE = 20.0
PASSING_THRESHOLD_PERCENTAGE = 45.0
MAX_IMAGE_SIZE = 800
