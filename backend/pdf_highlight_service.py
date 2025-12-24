"""
PDF Highlight Service
Adds highlight annotations to PDF documents based on text matching.
Uses PyMuPDF (fitz) for PDF manipulation.
"""

import fitz  # PyMuPDF
import os
import tempfile


def get_highlight_color(importance_level: str) -> tuple:
    """
    Get RGB color tuple for highlight based on importance level.
    Returns (red, green, blue) values from 0-1.
    """
    colors = {
        'high': (1.0, 0.6, 0.6),      # Light red
        'medium': (1.0, 0.85, 0.5),   # Light orange/yellow  
        'low': (0.6, 0.8, 1.0),       # Light blue
    }
    return colors.get(importance_level, (1.0, 1.0, 0.5))  # Default yellow


def add_highlights_to_pdf(pdf_path: str, annotations: list, output_path: str = None) -> dict:
    """
    Add highlight annotations to a PDF based on text matches.
    Uses multiple search strategies for better matching.
    Returns page numbers for each annotation to enable navigation.
    """
    try:
        doc = fitz.open(pdf_path)
        highlights_added = 0
        skipped = 0
        annotations_with_pages = []  # Track page numbers for each annotation
        
        for idx, annotation in enumerate(annotations):
            text_to_find = annotation.get('highlighted_text', '')
            importance = annotation.get('importance_level', 'medium')
            
            # Copy annotation with page info
            anno_with_page = {**annotation, 'page_number': None, 'found': False}
            
            if not text_to_find or len(text_to_find) < 5:
                skipped += 1
                annotations_with_pages.append(anno_with_page)
                continue
            
            found = False
            found_page = None
            
            # Try multiple search strategies
            search_variants = [
                text_to_find,                                    # Original
                text_to_find[:80],                               # First 80 chars
                text_to_find[:50],                               # First 50 chars
                ' '.join(text_to_find.split()[:10]),             # First 10 words
                ' '.join(text_to_find.split()[:5]),              # First 5 words
                ' '.join(text_to_find.split()[:3]),              # First 3 words
            ]
            
            # Remove duplicates while preserving order
            seen = set()
            unique_variants = []
            for v in search_variants:
                v_clean = v.strip()
                if v_clean and v_clean not in seen and len(v_clean) >= 5:
                    seen.add(v_clean)
                    unique_variants.append(v_clean)
            
            for search_text in unique_variants:
                if found:
                    break
                    
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    
                    # Try case-insensitive search
                    text_instances = page.search_for(search_text, quads=True)
                    
                    if text_instances:
                        color = get_highlight_color(importance)
                        
                        for quad in text_instances:
                            highlight = page.add_highlight_annot(quad)
                            if highlight:
                                highlight.set_colors(stroke=color)
                                highlight.set_opacity(0.5)
                                summary = annotation.get('summary', '')
                                category = annotation.get('category', '')
                                tooltip = f"[{category.upper()}] {summary}" if category else summary
                                if tooltip:
                                    highlight.set_info(content=tooltip)
                                highlight.update()
                                highlights_added += 1
                                found = True
                                found_page = page_num + 1  # 1-indexed for PDF viewers
                                print(f"  ✓ Found: '{search_text[:40]}...' on page {found_page}")
                        
                        break  # Found on this page, move to next annotation
            
            if not found:
                print(f"  ✗ Not found: '{text_to_find[:50]}...'")
            
            anno_with_page['page_number'] = found_page
            anno_with_page['found'] = found
            annotations_with_pages.append(anno_with_page)
        
        # Save the modified PDF
        if output_path is None:
            output_path = pdf_path.replace('.pdf', '_highlighted.pdf')
        
        doc.save(output_path)
        doc.close()
        
        print(f"✅ Added {highlights_added} highlights to PDF (skipped {skipped}): {output_path}")
        
        return {
            "success": True,
            "output_path": output_path,
            "highlights_added": highlights_added,
            "annotations_with_pages": annotations_with_pages
        }
        
    except Exception as e:
        print(f"❌ Failed to add highlights to PDF: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "output_path": None,
            "annotations_with_pages": []
        }


def create_highlighted_pdf_preview(
    template_name: str, 
    placeholders: dict, 
    annotations: list
) -> dict:
    """
    Generate a PDF preview with AI-based highlights.
    
    1. Generate PDF from template
    2. Add highlight annotations
    3. Return path to highlighted PDF
    """
    try:
        # Import contract service for PDF generation
        import contract_service
        
        print(f"📄 Creating highlighted PDF for template: {template_name}")
        
        # Generate the base PDF
        prepare_result = contract_service.prepare_contract(template_name, placeholders)
        
        if not prepare_result.get('success'):
            return {
                "success": False,
                "error": prepare_result.get('error', 'Failed to generate base PDF')
            }
        
        prepare_id = prepare_result.get('prepare_id')
        pdf_path = contract_service.get_prepared_contract(prepare_id)
        
        if not pdf_path:
            return {
                "success": False,
                "error": "PDF file not found"
            }
        
        # Add highlights
        highlighted_path = pdf_path.replace('.pdf', '_ai_highlighted.pdf')
        result = add_highlights_to_pdf(pdf_path, annotations, highlighted_path)
        
        if result.get('success'):
            return {
                "success": True,
                "pdf_path": highlighted_path,
                "original_path": pdf_path,
                "prepare_id": prepare_id,
                "highlights_added": result.get('highlights_added', 0),
                "annotations_with_pages": result.get('annotations_with_pages', [])
            }
        else:
            # Return original PDF if highlighting failed
            return {
                "success": True,
                "pdf_path": pdf_path,
                "prepare_id": prepare_id,
                "highlights_added": 0,
                "annotations_with_pages": [],
                "warning": "Highlighting failed, returning original PDF"
            }
            
    except Exception as e:
        print(f"❌ Failed to create highlighted PDF: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }
