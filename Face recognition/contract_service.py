# Contract Service for PDF Generation
# Handles: template download, placeholder filling, PDF conversion, upload

import os
import re
import tempfile
from docx import Document
from docx2pdf import convert
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for storage access

# Storage bucket names
TEMPLATE_BUCKET = "contract-pdf"
TEMPLATE_FOLDER = "templates"
GENERATED_FOLDER = "generated"

# Local temp folder
TEMP_FOLDER = "temp_contracts"
os.makedirs(TEMP_FOLDER, exist_ok=True)


def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def download_template(template_name: str) -> str:
    """
    Download .docx template from Supabase Storage.
    Returns local file path.
    """
    supabase = get_supabase_client()
    
    # Build storage path
    storage_path = f"{TEMPLATE_FOLDER}/{template_name}"
    
    print(f"📥 Downloading template: {storage_path}")
    
    # Download file
    response = supabase.storage.from_(TEMPLATE_BUCKET).download(storage_path)
    
    # Save to local temp file
    local_path = os.path.join(TEMP_FOLDER, template_name)
    with open(local_path, 'wb') as f:
        f.write(response)
    
    print(f"✅ Template saved to: {local_path}")
    return local_path


def fill_template(doc_path: str, placeholders: dict) -> str:
    """
    Replace {{PLACEHOLDER}} with actual values in the .docx document.
    Returns path to the filled document.
    """
    print(f"📝 Filling template with {len(placeholders)} placeholders")
    
    doc = Document(doc_path)
    
    # Replace placeholders in paragraphs
    for paragraph in doc.paragraphs:
        for key, value in placeholders.items():
            placeholder = f"{{{{{key}}}}}"  # {{KEY}}
            if placeholder in paragraph.text:
                # Replace in each run to preserve formatting
                for run in paragraph.runs:
                    if placeholder in run.text:
                        run.text = run.text.replace(placeholder, str(value))
    
    # Replace placeholders in tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    for key, value in placeholders.items():
                        placeholder = f"{{{{{key}}}}}"
                        if placeholder in paragraph.text:
                            for run in paragraph.runs:
                                if placeholder in run.text:
                                    run.text = run.text.replace(placeholder, str(value))
    
    # Save filled document
    filled_path = doc_path.replace('.docx', '_filled.docx')
    doc.save(filled_path)
    
    print(f"✅ Filled template saved to: {filled_path}")
    return filled_path


def convert_to_pdf(docx_path: str) -> str:
    """
    Convert .docx to PDF using Microsoft Word.
    Returns path to the PDF file.
    """
    print(f"🔄 Converting to PDF...")
    
    pdf_path = docx_path.replace('.docx', '.pdf')
    
    try:
        convert(docx_path, pdf_path)
        print(f"✅ PDF created: {pdf_path}")
        return pdf_path
    except Exception as e:
        print(f"❌ PDF conversion failed: {e}")
        raise


def upload_pdf(pdf_path: str, contract_id: str) -> str:
    """
    Upload generated PDF to Supabase Storage.
    Returns public URL.
    """
    supabase = get_supabase_client()
    
    # Storage path
    storage_path = f"{GENERATED_FOLDER}/{contract_id}.pdf"
    
    print(f"📤 Uploading PDF to: {storage_path}")
    
    # Read PDF file
    with open(pdf_path, 'rb') as f:
        pdf_data = f.read()
    
    # Upload to Supabase
    response = supabase.storage.from_(TEMPLATE_BUCKET).upload(
        storage_path,
        pdf_data,
        file_options={"content-type": "application/pdf"}
    )
    
    # Get public URL
    public_url = supabase.storage.from_(TEMPLATE_BUCKET).get_public_url(storage_path)
    
    print(f"✅ PDF uploaded: {public_url}")
    return public_url


def generate_contract(template_name: str, placeholders: dict, contract_id: str) -> dict:
    """
    Full workflow: download template → fill placeholders → convert to PDF → upload.
    Returns dict with success status and PDF URL.
    """
    try:
        # Step 1: Download template
        doc_path = download_template(template_name)
        
        # Step 2: Fill placeholders
        filled_path = fill_template(doc_path, placeholders)
        
        # Step 3: Convert to PDF
        pdf_path = convert_to_pdf(filled_path)
        
        # Step 4: Upload PDF
        pdf_url = upload_pdf(pdf_path, contract_id)
        
        # Cleanup temp files
        cleanup_temp_files([doc_path, filled_path, pdf_path])
        
        return {
            "success": True,
            "pdf_url": pdf_url,
            "contract_id": contract_id
        }
        
    except Exception as e:
        print(f"❌ Contract generation failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }


def cleanup_temp_files(file_paths: list):
    """Remove temporary files"""
    for path in file_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass


# Preview function (returns filled docx without converting to PDF)
def preview_contract(template_name: str, placeholders: dict) -> str:
    """
    Generate preview of contract (filled .docx).
    Returns local path to filled document.
    """
    doc_path = download_template(template_name)
    filled_path = fill_template(doc_path, placeholders)
    return filled_path
