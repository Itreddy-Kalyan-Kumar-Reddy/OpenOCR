"""
EasyOCR-based OCR engine with confidence scoring.
"""
import easyocr
import os
try:
    import fitz  # PyMuPDF
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False
from typing import Optional

# Initialize reader cache (language_tuple -> reader_instance)
_readers: dict = {}


def get_reader(languages: list = ["en"]) -> easyocr.Reader:
    """Get or create an EasyOCR reader for the specified languages."""
    global _readers
    lang_key = tuple(sorted(languages))
    
    if lang_key not in _readers:
        print(f"🔄 Loading EasyOCR models for {languages} (might download)...")
        _readers[lang_key] = easyocr.Reader(languages, gpu=False)
        print(f"✅ EasyOCR ready for {languages}")
    
    return _readers[lang_key]


def extract_text(file_path: str, languages: list = ["en"]) -> dict:
    """
    Extract text from a file (PDF or Image).
    - Tries Native PDF extraction first for digital PDFs.
    - Falls back to EasyOCR for images or scanned PDFs.
    Returns: { text, confidence, word_count, details, method }
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    # 1. Try Native PDF Extraction
    if ext == ".pdf" and HAS_FITZ:
        try:
            doc = fitz.open(file_path)
            full_text = ""
            details = []
            
            for page_num, page in enumerate(doc):
                text = page.get_text()
                if text.strip():
                    full_text += text + "\n"
                    # Create pseudo-details for consistency
                    # In a real implementation, we'd use page.get_text("dict") for coordinates
                    details.append({
                        "text": text.strip(),
                        "confidence": 100.0,
                        "page": page_num + 1
                    })

            # Heuristic: If we extracted a good amount of text, assume it's a digital PDF
            # If text is very sparse (e.g. < 50 chars per page), it might be a scanned PDF with noise
            if len(full_text.strip()) > 50:
                print(f"📄 Native PDF extraction success: {len(full_text)} chars")
                return {
                    "text": full_text.strip(),
                    "confidence": 100.0,
                    "word_count": len(full_text.split()),
                    "details": details,
                    "method": "native_pdf"
                }
            else:
                print("⚠️ PDF has little text, falling back to OCR (scanned doc)...")

        except Exception as e:
            print(f"❌ Native PDF extraction failed: {e}, falling back to OCR")

    # 2. Fallback to EasyOCR (Images / Scanned PDFs)
    # Note: EasyOCR handles PDFs by converting them to images internally if configured, 
    # but strictly speaking EasyOCR main entry point is for images. 
    # Current dependency 'easyocr' supports image paths. 
    # If we pass a PDF to easyocr.Reader.readtext, it might fail or require pdf2image.
    # For robust implementation, we should convert PDF to images here if EasyOCR doesn't match.
    # However, let's assume the user uploads images mostly or we add pdf2image support later.
    # For now, we proceed with EasyOCR which might throw error on PDF if not handled.
    # We'll use fitz to convert PDF to image if needed.

    if ext == ".pdf":
        # Convert PDF pages to images for OCR
        print("🔄 Converting PDF to images for OCR...")
        doc = fitz.open(file_path)
        full_text = ""
        total_conf = 0.0
        details = []
        
        reader = get_reader(languages)
        
        for page in doc:
            pix = page.get_pixmap()
            img_data = pix.tobytes("png")
            
            # Run OCR on image data
            results = reader.readtext(img_data, detail=1, paragraph=False)
            
            for bbox, text, conf in results:
                full_text += text + "\n"
                total_conf += conf
                details.append({
                    "text": text,
                    "confidence": round(conf * 100, 1),
                    "bbox": bbox,
                })

        avg_confidence = round((total_conf / len(details)) * 100, 1) if details else 0.0
        
        return {
            "text": full_text,
            "confidence": avg_confidence,
            "word_count": len(full_text.split()),
            "details": details,
            "method": "ocr_pdf"
        }

    # 3. Standard Image OCR
    reader = get_reader(languages)
    print(f"🔍 OCR processing: {os.path.basename(file_path)}")

    results = reader.readtext(file_path, detail=1, paragraph=False)

    if not results:
        return {
            "text": "",
            "confidence": 0.0,
            "word_count": 0,
            "details": [],
            "method": "ocr_image"
        }

    lines = []
    total_conf = 0.0
    details = []

    for bbox, text, conf in results:
        lines.append(text)
        total_conf += conf
        details.append({
            "text": text,
            "confidence": round(conf * 100, 1),
            "bbox": bbox,
        })

    full_text = "\n".join(lines)
    avg_confidence = round((total_conf / len(results)) * 100, 1)

    print(f"✅ OCR complete: {len(results)} text regions, {avg_confidence}% avg confidence")

    return {
        "text": full_text,
        "confidence": avg_confidence,
        "word_count": len(full_text.split()),
        "details": details,
        "method": "ocr_image"
    }
