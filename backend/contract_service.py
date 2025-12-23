# Contract Service for PDF Generation
# Handles: template download, placeholder filling, PDF conversion, upload

import os
import re
import json
import tempfile
import io
import base64
import requests
from docx import Document
from docx.shared import Inches
from docx2pdf import convert
from supabase import create_client, Client

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
# Use service key for storage access
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Storage bucket names
TEMPLATE_BUCKET = "contract_templates"   # Bucket for .docx templates
PDF_BUCKET = "contract-pdf"              # Bucket for generated PDFs
GENERATED_FOLDER = "generated"

# Template ID to file path mapping (loaded from config.json or hardcoded fallback)
TEMPLATE_PATHS = {
    "VEHICLE_USE": "Items & Assets/Vehicle Borrowing.docx",
    "ITEM_BORROW": "Items & Assets/Item Borrowing.docx",
    "BILL_SPLIT": "Money & Finance/Bill Split.docx",
    "FRIENDLY_LOAN": "Money & Finance/Friendly Loan.docx",
    "FREELANCE_JOB": "Service & Gig Work/Freelance Job.docx",
    "SALE_DEPOSIT": "Service & Gig Work/Sales & Deposit.docx",
}

# Load template config for mapping
try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    CONFIG_PATH = os.path.join(BASE_DIR, 'templates_config.json')
    with open(CONFIG_PATH, 'r') as f:
        TEMPLATE_CONFIG = json.load(f)
except Exception as e:
    print(f"Warning: Failed to load templates_config.json: {e}")
    TEMPLATE_CONFIG = {"categories": []}

def get_template_mapping(template_id: str) -> dict:
    """Find mapping for a given template ID"""
    for category in TEMPLATE_CONFIG.get('categories', []):
        for template in category.get('templates', []):
            if template['id'] == template_id:
                return template.get('mapping', {})
    return {}

def map_placeholders(placeholders: dict, mapping: dict) -> dict:
    """
    Map frontend keys to Docx placeholders based on config.
    If a key is not in mapping, it is passed through as-is (fallback).
    """
    mapped_data = {}
    
    # 1. Apply mapping
    for frontend_key, docx_key in mapping.items():
        if frontend_key in placeholders:
            mapped_data[docx_key] = placeholders[frontend_key]
            
    # 2. Pass through any keys that didn't match mapping (in case frontend sends raw keys)
    for key, value in placeholders.items():
        if key not in mapping:
            mapped_data[key] = value
            
    return mapped_data


# Local temp folder for working files
TEMP_FOLDER = "temp_contracts"
os.makedirs(TEMP_FOLDER, exist_ok=True)

# Prepared contracts folder (stores pre-generated PDFs awaiting preview/signing)
PREPARED_FOLDER = "prepared_contracts"
os.makedirs(PREPARED_FOLDER, exist_ok=True)

# Signatures folder (stores temporary signature images)
SIGNATURES_FOLDER = "temp_signatures"
os.makedirs(SIGNATURES_FOLDER, exist_ok=True)


def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def get_template_path(template_id: str) -> str:
    """
    Get the storage path for a template ID.
    Uses TEMPLATE_PATHS mapping or treats input as direct path.
    """
    # If it's a known template ID, map it
    if template_id in TEMPLATE_PATHS:
        return TEMPLATE_PATHS[template_id]

    # If it already looks like a path (contains / or .docx), use as-is
    if '/' in template_id or template_id.endswith('.docx'):
        return template_id

    # Default: assume it's in root with .docx extension
    return f"{template_id}.docx"


def download_template(template_name: str) -> str:
    """
    Download .docx template from Supabase Storage.
    Accepts template ID (e.g., 'ITEM_BORROW') or full path.
    Returns local file path.
    """
    supabase = get_supabase_client()

    # Resolve template ID to storage path
    storage_path = get_template_path(template_name)

    print(f"Downloading template: {storage_path}")

    try:
        # Try using signed URL (handles special characters better)
        signed_url_response = supabase.storage.from_(
            TEMPLATE_BUCKET).create_signed_url(storage_path, 60)
        if signed_url_response and 'signedURL' in signed_url_response:
            url = signed_url_response['signedURL']
            print(f"Using signed URL")

            response = requests.get(url)
            if response.status_code == 200:
                # Save to local temp file
                filename = os.path.basename(storage_path)
                local_path = os.path.join(TEMP_FOLDER, filename)
                with open(local_path, 'wb') as f:
                    f.write(response.content)

                print(f"Template saved to: {local_path}")
                return local_path
    except Exception as e:
        print(f"Signed URL failed: {e}")

    # Fallback: try direct download
    try:
        print(f"Trying direct download...")
        response = supabase.storage.from_(
            TEMPLATE_BUCKET).download(storage_path)

        # Save to local temp file
        filename = os.path.basename(storage_path)
        local_path = os.path.join(TEMP_FOLDER, filename)
        with open(local_path, 'wb') as f:
            f.write(response)

        print(f"Template saved to: {local_path}")
        return local_path
    except Exception as e:
        raise Exception(f"Failed to download template '{storage_path}': {e}")


def fetch_image(image_source):
    """
    Download image from URL or decode base64.
    Returns bytes stream (io.BytesIO) or None.
    """
    try:
        if not image_source:
            return None

        # Case 1: Base64 string
        if isinstance(image_source, str) and image_source.startswith('data:image'):
            # format: "data:image/png;base64,iVBQR..."
            header, encoded = image_source.split(',', 1)
            return io.BytesIO(base64.b64decode(encoded))

        # Case 2: URL
        if isinstance(image_source, str) and (image_source.startswith('http://') or image_source.startswith('https://')):
            response = requests.get(image_source, timeout=10)
            if response.status_code == 200:
                return io.BytesIO(response.content)

        return None
    except Exception as e:
        print(f"Failed to fetch image: {e}")
        return None


def fill_template(doc_path: str, placeholders: dict) -> str:
    """
    Replace {{PLACEHOLDER}} with actual values in the .docx document.
    Handles text replacement and image insertion for signatures.
    Returns path to the filled document.
    """
    print(f"Filling template with {len(placeholders)} placeholders")

    doc = Document(doc_path)

    # Identify signature keys that should be treated as images (both upper and lowercase)
    signature_keys = ['CREATOR_SIGNATURE', 'ACCEPTEE_SIGNATURE', 'SIGNATURE',
                      'creator_signature', 'acceptee_signature', 'signature']

    def process_paragraph(paragraph):
        # We invoke this for every placeholder.
        for key, value in placeholders.items():
            placeholder = f"{{{{{key}}}}}"  # {{KEY}}
            
            # Quick check if placeholder exists in the full text at all
            if placeholder in paragraph.text:
                
                # Special handling for signatures (images)
                if key in signature_keys and value:
                    print(f"Found signature placeholder: {key}")
                    found_sig = False
                    for run in paragraph.runs:
                        if placeholder in run.text:
                            run.text = run.text.replace(placeholder, "")
                            img_stream = fetch_image(value)
                            if img_stream:
                                run.add_picture(img_stream, width=Inches(1.5))
                                print(f"Signature inserted for {key}")
                                found_sig = True
                    
                    if not found_sig:
                         # If signature placeholder is split across runs
                         print(f"Signature placeholder {key} split across runs. clearing and appending.")
                         paragraph.text = paragraph.text.replace(placeholder, "")
                         run = paragraph.add_run()
                         img_stream = fetch_image(value)
                         if img_stream:
                             run.add_picture(img_stream, width=Inches(1.5))

                else:
                    # Text replacement
                    replaced_in_run = False
                    for run in paragraph.runs:
                        if placeholder in run.text:
                            run.text = run.text.replace(placeholder, str(value))
                            replaced_in_run = True
                    
                    # If not found in any single run, it means it's split across runs
                    if not replaced_in_run:
                        paragraph.text = paragraph.text.replace(placeholder, str(value))

    # Replace in paragraphs
    for paragraph in doc.paragraphs:
        process_paragraph(paragraph)

    # Replace in tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    process_paragraph(paragraph)

    # Save filled document
    filled_path = doc_path.replace('.docx', '_filled.docx')
    doc.save(filled_path)
    
    print(f"Filled template saved to: {filled_path}")
    return filled_path


def convert_to_pdf(docx_path: str) -> str:
    """
    Convert .docx to PDF using Microsoft Word.
    Returns path to the PDF file.
    """
    print(f"Converting to PDF...")

    pdf_path = docx_path.replace('.docx', '.pdf')

    try:
        convert(docx_path, pdf_path)
        print(f"PDF created: {pdf_path}")
        return pdf_path
    except AttributeError as e:
        # Known issue: Word.Application.Quit fails but PDF is created successfully
        if "Quit" in str(e) and os.path.exists(pdf_path):
            print(f"Word quit error ignored, PDF created: {pdf_path}")
            return pdf_path
        print(f"PDF conversion failed: {e}")
        raise
    except Exception as e:
        # Check if PDF was created despite error
        if os.path.exists(pdf_path):
            print(f"Error occurred but PDF exists: {pdf_path}")
            return pdf_path
        print(f"PDF conversion failed: {e}")
        raise


def upload_pdf(pdf_path: str, contract_id: str) -> str:
    """
    Upload generated PDF to Supabase Storage (contract_pdf bucket).
    Returns public URL.
    """
    supabase = get_supabase_client()

    # Storage path in the PDF bucket
    storage_path = f"{GENERATED_FOLDER}/{contract_id}.pdf"

    print(f"Uploading PDF to bucket '{PDF_BUCKET}': {storage_path}")

    # Read PDF file
    with open(pdf_path, 'rb') as f:
        pdf_data = f.read()

    # Upload to Supabase PDF bucket
    response = supabase.storage.from_(PDF_BUCKET).upload(
        storage_path,
        pdf_data,
        file_options={"content-type": "application/pdf"}
    )

    # Get public URL
    public_url = supabase.storage.from_(
        PDF_BUCKET).get_public_url(storage_path)

    print(f"PDF uploaded: {public_url}")
    return public_url


def generate_contract(template_name: str, placeholders: dict, contract_id: str) -> dict:
    """
    Full workflow: download template -> fill placeholders -> convert to PDF -> upload.
    Returns dict with success status and PDF URL.
    """
    try:
        # Step 0: Map placeholders
        mapping = get_template_mapping(template_name)
        print(f"\nDEBUG: Template ID: {template_name}")
        print(f"DEBUG: Mapping Config: {mapping}")
        print(f"DEBUG: Raw Placeholders (Keys): {list(placeholders.keys())}")
        
        mapped_placeholders = map_placeholders(placeholders, mapping)
        
        print(f"DEBUG: Mapped Placeholders: {mapped_placeholders}")
        print(f"Mapped placeholders for {template_name}")

        # Step 1: Download template
        doc_path = download_template(template_name)

        # Step 2: Fill placeholders
        filled_path = fill_template(doc_path, mapped_placeholders)
        
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
        print(f"Contract generation failed: {e}")
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


def prepare_contract(template_name: str, placeholders: dict) -> dict:
    """
    Prepare contract by downloading template, filling placeholders, and converting to PDF.
    Stores PDF in prepared_contracts folder for later retrieval.
    Returns dict with prepare_id to retrieve the PDF later.
    """
    import uuid

    try:
        # Generate unique ID for this prepared contract
        prepare_id = str(uuid.uuid4())[:8]

        print(f"Preparing contract: {template_name} (ID: {prepare_id})")

        # Step 0: Map placeholders
        mapping = get_template_mapping(template_name)
        mapped_placeholders = map_placeholders(placeholders, mapping)

        # Step 1: Download template
        doc_path = download_template(template_name)

        # Step 2: Fill placeholders
        filled_path = fill_template(doc_path, mapped_placeholders)

        # Step 3: Convert to PDF
        pdf_path = convert_to_pdf(filled_path)

        # Step 4: Move PDF to prepared folder with prepare_id
        prepared_pdf_path = os.path.join(PREPARED_FOLDER, f"{prepare_id}.pdf")
        os.rename(pdf_path, prepared_pdf_path)

        # Cleanup temp files (but keep the prepared PDF)
        cleanup_temp_files([doc_path, filled_path])

        print(f"Contract prepared: {prepared_pdf_path}")

        return {
            "success": True,
            "prepare_id": prepare_id,
            "message": "Contract prepared successfully"
        }

    except Exception as e:
        print(f"Contract preparation failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }


def get_prepared_contract(prepare_id: str) -> str:
    """
    Get the path to a prepared contract PDF.
    Returns the file path or None if not found.
    """
    pdf_path = os.path.join(PREPARED_FOLDER, f"{prepare_id}.pdf")
    if os.path.exists(pdf_path):
        return pdf_path
    return None


def cleanup_prepared_contract(prepare_id: str):
    """Remove a prepared contract after it's been used"""
    pdf_path = os.path.join(PREPARED_FOLDER, f"{prepare_id}.pdf")
    if os.path.exists(pdf_path):
        try:
            os.remove(pdf_path)
            print(f"Cleaned up prepared contract: {prepare_id}")
        except Exception as e:
            print(f"Failed to cleanup prepared contract: {e}")


def save_signature_image(signature_base64: str, signature_id: str) -> str:
    """
    Save base64 signature image to temp folder.
    Returns the local file path.
    """
    try:
        # Remove data URL prefix if present
        if ',' in signature_base64:
            signature_base64 = signature_base64.split(',')[1]

        # Decode base64
        signature_data = base64.b64decode(signature_base64)

        # Save to file
        signature_path = os.path.join(SIGNATURES_FOLDER, f"{signature_id}.png")
        with open(signature_path, 'wb') as f:
            f.write(signature_data)

        print(f"Signature saved: {signature_path}")
        return signature_path
    except Exception as e:
        print(f"Failed to save signature: {e}")
        return None


def generate_signed_contract(
    template_name: str,
    placeholders: dict,
    creator_signature_base64: str,
    creator_name: str,
    creator_ic: str,
    contract_id: str
) -> str:
    """
    Generate a signed version of the contract with:
    - Creator signature image
    - Timestamp of signing
    - Creator name and IC
    Returns path to the signed PDF.
    """
    from datetime import datetime

    try:
        print(f"Generating signed contract: {contract_id}")

        # Save signature to temp file
        signature_path = save_signature_image(
            creator_signature_base64, f"sig_{contract_id}")

        # Get current timestamp
        signing_timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        # Update placeholders with signature info
        signed_placeholders = {**placeholders}

        # Add creator signature (will be inserted as image)
        if signature_path and os.path.exists(signature_path):
            with open(signature_path, 'rb') as f:
                sig_data = f.read()
            sig_base64 = f"data:image/png;base64,{base64.b64encode(sig_data).decode()}"
            signed_placeholders['CREATOR_SIGNATURE'] = sig_base64
            signed_placeholders['creator_signature'] = sig_base64

        # Add signing details - support both uppercase and lowercase
        signed_placeholders['SIGNING_DATE'] = signing_timestamp
        signed_placeholders['signing_date'] = signing_timestamp
        signed_placeholders['CREATOR_SIGNING_DATE'] = signing_timestamp
        signed_placeholders['creator_signing_date'] = signing_timestamp

        # Creator name and IC
        signed_placeholders['CREATOR_NAME'] = creator_name
        signed_placeholders['creator_name'] = creator_name
        signed_placeholders['CREATOR_IC'] = creator_ic
        signed_placeholders['creator_ic'] = creator_ic
        signed_placeholders['creator_id_number'] = creator_ic

        # Download template fresh
        doc_path = download_template(template_name)

        # Apply mapping to ensure frontend keys match Word template placeholders
        mapping = get_template_mapping(template_name)
        mapped_placeholders = map_placeholders(signed_placeholders, mapping)
        
        print(f"DEBUG: Signed contract placeholders: {list(mapped_placeholders.keys())}")

        # Fill with updated placeholders including signature
        filled_path = fill_template(doc_path, mapped_placeholders)

        # Convert to PDF
        pdf_path = convert_to_pdf(filled_path)

        # Cleanup temp files
        cleanup_temp_files([doc_path, filled_path])
        if signature_path and os.path.exists(signature_path):
            cleanup_temp_files([signature_path])

        print(f"Signed contract generated: {pdf_path}")
        return pdf_path

    except Exception as e:
        print(f"Failed to generate signed contract: {e}")
        import traceback
        traceback.print_exc()
        return None


# Preview function (returns filled docx without converting to PDF)
def preview_contract(template_name: str, placeholders: dict) -> str:
    """
    Generate preview of contract (filled .docx).
    Returns local path to filled document.
    """
    try:
        # Step 0: Map placeholders
        print(f"\nDEBUG: Previewing template: {template_name}")
        mapping = get_template_mapping(template_name)
        print(f"DEBUG: Preview Mapping Config: {mapping}")
        print(f"DEBUG: Raw Preview Placeholders: {placeholders}")
        
        mapped_placeholders = map_placeholders(placeholders, mapping)
        print(f"DEBUG: Mapped Preview Placeholders: {mapped_placeholders}")
        
        doc_path = download_template(template_name)
        filled_path = fill_template(doc_path, mapped_placeholders)
        return filled_path
    except Exception as e:
        print(f"Preview failed: {e}")
        import traceback
        traceback.print_exc()
        raise


def upload_contract_pdf(pdf_path: str, user_id: str, contract_id: str) -> str:
    """
    Upload contract PDF to Supabase Storage under user_id folder.
    Storage path: {user_id}/{contract_id}.pdf
    Returns public URL.
    """
    supabase = get_supabase_client()

    # Storage path: user_id/contract_id.pdf
    storage_path = f"{user_id}/{contract_id}.pdf"

    print(f"Uploading PDF to bucket '{PDF_BUCKET}': {storage_path}")

    # Read PDF file
    with open(pdf_path, 'rb') as f:
        pdf_data = f.read()

    # Upload to Supabase PDF bucket
    try:
        response = supabase.storage.from_(PDF_BUCKET).upload(
            storage_path,
            pdf_data,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        # If file already exists, try to update it
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            print(f"File exists, updating: {storage_path}")
            response = supabase.storage.from_(PDF_BUCKET).update(
                storage_path,
                pdf_data,
                file_options={"content-type": "application/pdf"}
            )
        else:
            raise e

    # Get public URL
    public_url = supabase.storage.from_(
        PDF_BUCKET).get_public_url(storage_path)

    print(f"PDF uploaded: {public_url}")
    return public_url


def create_contract_record(contract_data: dict) -> dict:
    """
    Create a new contract record in Supabase contracts table.
    Returns the created contract data.
    """
    supabase = get_supabase_client()

    print(f"Creating contract record: {contract_data.get('contract_id')}")

    # Insert into contracts table
    result = supabase.table('contracts').insert(contract_data).execute()

    if result.data:
        print(f"Contract record created: {result.data[0].get('contract_id')}")
        return result.data[0]
    else:
        raise Exception("Failed to create contract record")


def finalize_contract(
    prepare_id: str,
    user_id: str,
    acceptee_id: str,
    contract_name: str,
    contract_topic: str,
    template_type: str,
    form_data: dict,
    creator_signature: str = None,
    creator_name: str = None,
    creator_ic: str = None,
    creator_nfc_verified: bool = False,
    creator_face_verified: bool = False,
    due_date: str = None
) -> dict:
    """
    Finalize contract creation:
    1. Generate signed PDF with creator signature, timestamp, and details
    2. Upload PDF to storage under user_id folder
    3. Create contract record in database
    4. Cleanup prepared contract
    Returns dict with contract data and PDF URL.
    """
    import uuid
    from datetime import datetime, timedelta

    try:
        # Generate contract ID
        contract_id = f"CNT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:4].upper()}"

        print(f"Finalizing contract: {contract_id}")

        # Step 1: Generate signed contract with signature embedded
        if creator_signature:
            print("Generating signed version with creator signature...")

            # Build placeholders from form_data
            # Use lowercase keys to match Word template placeholders
            placeholders = {**form_data}
            placeholders['creator_name'] = creator_name or ''
            placeholders['creator_id_number'] = creator_ic or ''

            # Generate signed PDF
            pdf_path = generate_signed_contract(
                template_name=template_type,
                placeholders=placeholders,
                creator_signature_base64=creator_signature,
                creator_name=creator_name or 'Unknown',
                creator_ic=creator_ic or 'Unknown',
                contract_id=contract_id
            )

            if not pdf_path:
                print("Signed contract generation failed, using prepared contract")
                pdf_path = get_prepared_contract(prepare_id)
        else:
            # No signature provided, use prepared contract
            pdf_path = get_prepared_contract(prepare_id)

        if not pdf_path:
            return {
                "success": False,
                "error": f"Contract PDF not found"
            }

        # Step 2: Upload PDF to storage under user_id folder
        pdf_url = upload_contract_pdf(pdf_path, user_id, contract_id)

        # Step 3: Create contract record in database
        contract_data = {
            "contract_id": contract_id,
            "created_user_id": user_id,
            "acceptee_user_id": acceptee_id,
            "contract_name": contract_name,
            "contract_topic": contract_topic,
            "status": "Pending",
            "template_type": template_type,
            "form_data": form_data,
            "pdf_url": pdf_url,
            "creator_nfc_verified": creator_nfc_verified,
            "creator_face_verified": creator_face_verified,
            "acceptee_nfc_verified": False,
            "acceptee_face_verified": False,
            "created_at": datetime.now().isoformat(),
            "due_date": due_date or (datetime.now() + timedelta(days=30)).isoformat(),
        }

        created_contract = create_contract_record(contract_data)

        # Step 4: Cleanup prepared contract and temp PDF
        cleanup_prepared_contract(prepare_id)
        if pdf_path and os.path.exists(pdf_path) and TEMP_FOLDER in pdf_path:
            cleanup_temp_files([pdf_path])

        return {
            "success": True,
            "contract": created_contract,
            "pdf_url": pdf_url,
            "contract_id": contract_id
        }

    except Exception as e:
        print(f"Contract finalization failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }
