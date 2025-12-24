# AI Annotation Service for Contract Analysis
# Uses Google Gemini API to extract important clauses from contract text

import os
import json
import re
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import Google Generative AI
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    print("Warning: google-generativeai not installed. Run: pip install google-generativeai")
    GEMINI_AVAILABLE = False
    genai = None

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ Gemini API configured successfully")
else:
    print("⚠️ Gemini API key not found in environment variables")

# Valid importance levels and categories
VALID_IMPORTANCE_LEVELS = {'high', 'medium', 'low'}
VALID_CATEGORIES = {
    'payment', 'liability', 'termination', 'data', 'confidentiality',
    'dispute', 'renewal', 'obligation', 'rights', 'penalty', 'warranty',
    'indemnification', 'force_majeure', 'general'
}

# Gemini prompt template for clause extraction
ANNOTATION_PROMPT_TEMPLATE = """You are a legal document analyzer specializing in Malaysian contracts. Your task is to extract ONLY the important clauses from this contract.

CRITICAL RULES:
1. Do NOT summarize the whole document - extract individual important clauses only
2. Extract ONLY clauses that have legal significance (payments, obligations, penalties, rights, etc.)
3. Each clause must be anchored with EXACT character indices (start_index and end_index)
4. The highlighted_text MUST be an exact substring of the original text
5. Provide a 1-2 sentence summary explaining the legal significance
6. Assign importance: "high" (critical terms), "medium" (important), "low" (good to know)
7. Categorize each clause appropriately

CATEGORIES (choose one per clause):
- payment: Money, fees, amounts, payment terms
- liability: Who is responsible for what
- termination: How/when agreement can end
- penalty: Late fees, damages, consequences for breach
- obligation: Required actions/duties of parties
- rights: Entitlements and permissions
- confidentiality: Privacy and non-disclosure terms
- dispute: How disputes are resolved
- warranty: Guarantees and assurances
- indemnification: Protection from losses/damages
- renewal: Extension or continuation terms
- general: Other important terms

OUTPUT FORMAT - Return ONLY valid JSON (no markdown, no explanation, no code blocks):
{{
  "annotations": [
    {{
      "highlighted_text": "exact text from document",
      "summary": "1-2 sentence explanation of legal significance",
      "importance_level": "high",
      "category": "payment",
      "start_index": 0,
      "end_index": 50
    }}
  ]
}}

IMPORTANT: start_index and end_index must be exact character positions where highlighted_text appears in the CONTRACT TEXT below.

CONTRACT TEXT:
{agreement_text}"""


def validate_annotation(annotation: Dict, text: str) -> tuple[bool, str]:
    """
    Validate a single annotation against the source text.
    Returns (is_valid, error_message).
    """
    required_fields = ['highlighted_text', 'summary', 'importance_level', 'category', 'start_index', 'end_index']
    
    # Check required fields
    for field in required_fields:
        if field not in annotation:
            return False, f"Missing required field: {field}"
    
    # Validate importance level
    if annotation['importance_level'] not in VALID_IMPORTANCE_LEVELS:
        return False, f"Invalid importance_level: {annotation['importance_level']}"
    
    # Validate category (be lenient - accept unknown categories as 'general')
    if annotation['category'] not in VALID_CATEGORIES:
        annotation['category'] = 'general'
    
    # Validate indices are integers
    try:
        start_idx = int(annotation['start_index'])
        end_idx = int(annotation['end_index'])
    except (ValueError, TypeError):
        return False, "start_index and end_index must be integers"
    
    # Validate index bounds
    if start_idx < 0:
        return False, f"start_index cannot be negative: {start_idx}"
    
    if end_idx > len(text):
        return False, f"end_index exceeds text length: {end_idx} > {len(text)}"
    
    if start_idx >= end_idx:
        return False, f"start_index must be less than end_index: {start_idx} >= {end_idx}"
    
    # Validate highlighted_text matches text at indices
    expected_text = text[start_idx:end_idx]
    actual_text = annotation['highlighted_text']
    
    if expected_text != actual_text:
        # Try to find the actual position of the highlighted text
        actual_start = text.find(actual_text)
        if actual_start != -1:
            # Auto-correct the indices
            annotation['start_index'] = actual_start
            annotation['end_index'] = actual_start + len(actual_text)
            return True, "Indices auto-corrected"
        else:
            return False, f"highlighted_text not found in document"
    
    return True, "Valid"


def fix_annotation_indices(annotations: List[Dict], text: str) -> List[Dict]:
    """
    Attempt to fix annotation indices by finding the actual text positions.
    """
    fixed_annotations = []
    
    for annotation in annotations:
        highlighted = annotation.get('highlighted_text', '')
        if not highlighted:
            continue
            
        # Try to find the exact text in the document
        start_idx = text.find(highlighted)
        
        if start_idx != -1:
            annotation['start_index'] = start_idx
            annotation['end_index'] = start_idx + len(highlighted)
            fixed_annotations.append(annotation)
        else:
            # Try partial match - find the longest matching substring
            words = highlighted.split()
            if len(words) > 3:
                # Try to find a subset of the text
                partial = ' '.join(words[:5])
                partial_idx = text.find(partial)
                if partial_idx != -1:
                    # Find where this clause ends
                    end_search = text[partial_idx:partial_idx + len(highlighted) + 100]
                    annotation['highlighted_text'] = end_search[:len(highlighted)]
                    annotation['start_index'] = partial_idx
                    annotation['end_index'] = partial_idx + len(highlighted)
                    fixed_annotations.append(annotation)
                    
    return fixed_annotations


def extract_json_from_response(response_text: str) -> Dict:
    """
    Extract JSON from Gemini response, handling markdown code blocks.
    """
    # Remove markdown code blocks if present
    text = response_text.strip()
    
    # Try to find JSON in code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if json_match:
        text = json_match.group(1).strip()
    
    # Try to find JSON object directly
    json_obj_match = re.search(r'\{[\s\S]*\}', text)
    if json_obj_match:
        text = json_obj_match.group(0)
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON response: {e}")


def extract_contract_annotations(agreement_text: str) -> Dict:
    """
    Main function to extract annotations from contract text using Gemini API.
    
    Args:
        agreement_text: The full contract text to analyze
        
    Returns:
        Dict with 'success', 'annotations' list, and optional 'error'
    """
    if not GEMINI_AVAILABLE:
        return {
            'success': False,
            'error': 'Gemini API not available. Please install google-generativeai',
            'annotations': []
        }
    
    if not GEMINI_API_KEY:
        return {
            'success': False,
            'error': 'GEMINI_API_KEY not configured in environment variables',
            'annotations': []
        }
    
    if not agreement_text or len(agreement_text.strip()) < 50:
        return {
            'success': False,
            'error': 'Agreement text too short for analysis',
            'annotations': []
        }
    
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build prompt
        prompt = ANNOTATION_PROMPT_TEMPLATE.format(agreement_text=agreement_text)
        
        # Generate response
        print(f"📤 Sending contract ({len(agreement_text)} chars) to Gemini for analysis...")
        response = model.generate_content(prompt)
        
        if not response.text:
            return {
                'success': False,
                'error': 'Empty response from Gemini API',
                'annotations': []
            }
        
        print(f"📥 Received response from Gemini ({len(response.text)} chars)")
        
        # Parse JSON from response
        result = extract_json_from_response(response.text)
        
        if 'annotations' not in result:
            return {
                'success': False,
                'error': 'Response missing annotations field',
                'annotations': []
            }
        
        raw_annotations = result['annotations']
        print(f"📋 Extracted {len(raw_annotations)} raw annotations")
        
        # Fix indices for all annotations
        fixed_annotations = fix_annotation_indices(raw_annotations, agreement_text)
        print(f"✅ Fixed indices for {len(fixed_annotations)} annotations")
        
        # Validate each annotation
        valid_annotations = []
        for annotation in fixed_annotations:
            is_valid, message = validate_annotation(annotation, agreement_text)
            if is_valid:
                valid_annotations.append(annotation)
            else:
                print(f"⚠️ Skipping invalid annotation: {message}")
        
        print(f"✅ {len(valid_annotations)} valid annotations extracted")
        
        return {
            'success': True,
            'annotations': valid_annotations,
            'total_extracted': len(raw_annotations),
            'total_valid': len(valid_annotations)
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e),
            'annotations': []
        }


def get_annotation_color(importance_level: str) -> str:
    """
    Get the color code for an importance level.
    """
    colors = {
        'high': '#EF4444',      # Red
        'medium': '#F97316',    # Orange
        'low': '#3B82F6'        # Blue
    }
    return colors.get(importance_level, '#6B7280')  # Gray default


def get_category_emoji(category: str) -> str:
    """
    Get emoji for a category.
    """
    emojis = {
        'payment': '💰',
        'liability': '⚖️',
        'termination': '🚫',
        'penalty': '⚠️',
        'obligation': '📋',
        'rights': '✅',
        'confidentiality': '🔒',
        'dispute': '🤝',
        'warranty': '🛡️',
        'indemnification': '🔐',
        'renewal': '🔄',
        'general': '📄'
    }
    return emojis.get(category, '📌')


# Test function
if __name__ == '__main__':
    # Simple test
    test_text = """
    LOAN AGREEMENT
    
    This Agreement is made between Ahmad bin Abdullah (IC: 901234-56-7890) hereinafter 
    referred to as "Lender" and Siti binti Hassan (IC: 890123-45-6789) hereinafter 
    referred to as "Borrower".
    
    1. LOAN AMOUNT
    The Lender agrees to loan the Borrower a sum of Ringgit Malaysia Ten Thousand 
    (RM10,000.00) for personal use.
    
    2. REPAYMENT TERMS
    The Borrower shall repay the full loan amount within 12 months from the date of 
    this agreement. Monthly installments of RM850.00 shall be paid by the 15th of each month.
    
    3. LATE PAYMENT PENALTY
    Failure to make timely payments will result in a late fee of 5% of the outstanding 
    balance per month of delay.
    
    4. TERMINATION
    Either party may terminate this agreement with 30 days written notice. Upon termination,
    the full outstanding balance becomes immediately due and payable.
    
    5. DISPUTE RESOLUTION
    Any disputes arising from this agreement shall be resolved through mediation before 
    proceeding to court action in Malaysian jurisdiction.
    """
    
    result = extract_contract_annotations(test_text)
    print("\n" + "="*50)
    print("TEST RESULTS:")
    print("="*50)
    print(json.dumps(result, indent=2, ensure_ascii=False))
