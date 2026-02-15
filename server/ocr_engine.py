"""
EasyOCR-based OCR engine with confidence scoring.
"""
import easyocr
import os
from typing import Optional

# Initialize reader lazily (models download on first use)
_reader: Optional[easyocr.Reader] = None


def get_reader() -> easyocr.Reader:
    """Get or create the EasyOCR reader (singleton)."""
    global _reader
    if _reader is None:
        print("🔄 Loading EasyOCR models (first run downloads ~100MB)...")
        _reader = easyocr.Reader(["en"], gpu=False)
        print("✅ EasyOCR ready")
    return _reader


def extract_text(file_path: str) -> dict:
    """
    Extract text from an image file using EasyOCR.
    Returns: { text, confidence, word_count, details }
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    reader = get_reader()
    print(f"🔍 OCR processing: {os.path.basename(file_path)}")

    # EasyOCR returns list of (bbox, text, confidence)
    results = reader.readtext(file_path, detail=1, paragraph=False)

    if not results:
        return {
            "text": "",
            "confidence": 0.0,
            "word_count": 0,
            "details": [],
        }

    # Build full text and calculate average confidence
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
    }
