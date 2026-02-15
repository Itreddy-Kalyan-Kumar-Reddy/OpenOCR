"""
Key-value extraction engine.
Enhanced regex patterns + optional Ollama LLM integration.
"""
import re
import httpx
import json
from typing import Optional

# ---- Field Pattern Definitions ----
FIELD_PATTERNS = {
    "invoice_number": {
        "label": "Invoice Number",
        "patterns": [
            r"(?:invoice|inv|bill|receipt|ref(?:erence)?)\s*(?:#|no\.?|number|num|id)?[:\s\-]*([A-Z0-9][\w\-\/]{2,20})",
        ],
        "base_confidence": 88,
    },
    "date": {
        "label": "Date",
        "patterns": [
            r"(?:invoice\s*)?date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
            r"(?:invoice\s*)?date\s*[:\-]?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{2,4})",
            r"(?:invoice\s*)?date\s*[:\-]?\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}[\s,]*\d{2,4})",
            r"(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})",
            r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        ],
        "base_confidence": 82,
    },
    "due_date": {
        "label": "Due Date",
        "patterns": [
            r"(?:due|payment)\s*date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
            r"(?:due|payment)\s*date\s*[:\-]?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{2,4})",
            r"due\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        ],
        "base_confidence": 84,
    },
    "total_amount": {
        "label": "Total Amount",
        "patterns": [
            r"(?:grand\s*)?total\s*(?:amount|due|payable)?\s*[:\-]?\s*[$£€₹]?\s*([\d,]+\.?\d{0,2})",
            r"amount\s*(?:due|payable)\s*[:\-]?\s*[$£€₹]?\s*([\d,]+\.?\d{0,2})",
            r"balance\s*due\s*[:\-]?\s*[$£€₹]?\s*([\d,]+\.?\d{0,2})",
            r"total\s*[:\-]?\s*[$£€₹]\s*([\d,]+\.?\d{0,2})",
        ],
        "base_confidence": 85,
    },
    "subtotal": {
        "label": "Subtotal",
        "patterns": [
            r"sub\s*[-]?\s*total\s*[:\-]?\s*[$£€₹]?\s*([\d,]+\.?\d{0,2})",
            r"net\s*(?:amount|total)\s*[:\-]?\s*[$£€₹]?\s*([\d,]+\.?\d{0,2})",
        ],
        "base_confidence": 80,
    },
    "tax_amount": {
        "label": "Tax Amount",
        "patterns": [
            r"(?:sales\s*)?tax\s*(?:amount)?\s*[:\-]?\s*[$£€₹]?\s*([\d,]+\.?\d{0,2})",
            r"(?:vat|gst|cgst|sgst|igst)\s*(?:amount)?\s*[:\-]?\s*[$£€₹]?\s*([\d,]+\.?\d{0,2})",
            r"tax\s*\(?\d*%?\)?\s*[:\-]?\s*[$£€₹]?\s*([\d,]+\.?\d{0,2})",
        ],
        "base_confidence": 80,
    },
    "vendor_name": {
        "label": "Vendor / Company",
        "patterns": [
            r"(?:from|vendor|seller|company|billed?\s*by|issued\s*by)\s*[:\-]?\s*(.{3,80})",
            r"^([A-Z][A-Za-z\s&.,]+(?:Inc|LLC|Ltd|Corp|Co|Pvt|Limited|LLP)?\.?)$",
        ],
        "base_confidence": 68,
        "max_length": 100,
    },
    "customer_name": {
        "label": "Customer / Bill To",
        "patterns": [
            r"(?:bill\s*to|customer|client|sold\s*to|ship\s*to|buyer)\s*[:\-]?\s*(.{3,80})",
            r"(?:attn|attention)\s*[:\-]?\s*(.{3,60})",
        ],
        "base_confidence": 72,
        "max_length": 100,
    },
    "currency": {
        "label": "Currency",
        "patterns": [
            r"currency\s*[:\-]?\s*([A-Z]{3})",
            r"\b(USD|EUR|GBP|INR|AUD|CAD|JPY|AED|SGD)\b",
            r"([$£€₹])",
        ],
        "base_confidence": 78,
    },
    "payment_method": {
        "label": "Payment Method",
        "patterns": [
            r"payment\s*(?:method|mode|type|via|terms?)\s*[:\-]?\s*(.{3,60})",
            r"(?:paid?\s*(?:by|via|through))\s*[:\-]?\s*(.{3,40})",
        ],
        "base_confidence": 72,
        "max_length": 60,
    },
    "po_number": {
        "label": "PO Number",
        "patterns": [
            r"(?:purchase\s*order|p\.?o\.?)\s*(?:#|no\.?|number)?\s*[:\-]?\s*([A-Z0-9][\w\-\/]{2,20})",
        ],
        "base_confidence": 82,
    },
    "address": {
        "label": "Address",
        "patterns": [
            r"address\s*[:\-]?\s*(.+(?:\n.+){0,3})",
        ],
        "base_confidence": 62,
        "max_length": 200,
    },
}

CURRENCY_MAP = {"$": "USD", "£": "GBP", "€": "EUR", "₹": "INR"}


def detect_fields(text: str) -> list[dict]:
    """Detect which fields are likely present in the OCR text."""
    results = []
    for key, config in FIELD_PATTERNS.items():
        detected = False
        for pattern in config["patterns"]:
            if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
                detected = True
                break
        results.append({"key": key, "label": config["label"], "detected": detected})
    return results


def extract_fields_regex(text: str, selected_fields: list[str]) -> list[dict]:
    """Extract selected fields using regex patterns."""
    results = []

    for field_key in selected_fields:
        config = FIELD_PATTERNS.get(field_key)
        if not config:
            continue

        best_value = None
        best_confidence = 0

        for i, pattern in enumerate(config["patterns"]):
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match and match.group(1):
                bonus = max(0, 10 - i * 3)
                confidence = min(99, config["base_confidence"] + bonus)
                if confidence > best_confidence:
                    value = match.group(1).strip()
                    # Apply post-processing
                    if field_key == "currency" and value in CURRENCY_MAP:
                        value = CURRENCY_MAP[value]
                    max_len = config.get("max_length")
                    if max_len:
                        value = value[:max_len]
                    # Clean up
                    value = re.sub(r"\s+", " ", value).strip()
                    best_value = value
                    best_confidence = confidence

        results.append({
            "key": field_key,
            "label": config["label"],
            "value": best_value,
            "confidence": best_confidence if best_value else 0,
        })

    return results


async def extract_fields_llm(text: str, selected_fields: list[str]) -> Optional[list[dict]]:
    """
    Try to extract fields using Ollama LLM (if available).
    Returns None if Ollama is not running.
    """
    field_labels = {k: FIELD_PATTERNS[k]["label"] for k in selected_fields if k in FIELD_PATTERNS}
    if not field_labels:
        return None

    prompt = f"""Extract the following fields from this billing document text. Return ONLY a valid JSON object with field keys and their extracted values. If a field is not found, set its value to null.

Fields to extract:
{json.dumps(field_labels, indent=2)}

Document text:
---
{text[:3000]}
---

Return ONLY valid JSON like: {{"invoice_number": "INV-001", "date": "2024-01-15", ...}}"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "mistral",
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                },
            )
            if resp.status_code != 200:
                return None

            data = resp.json()
            response_text = data.get("response", "")

            # Parse JSON from response
            parsed = json.loads(response_text)
            results = []
            for key in selected_fields:
                val = parsed.get(key)
                results.append({
                    "key": key,
                    "label": field_labels.get(key, key),
                    "value": str(val) if val is not None else None,
                    "confidence": 92 if val is not None else 0,
                })
            print("✅ LLM extraction successful")
            return results

    except Exception as e:
        print(f"⚠️ LLM extraction unavailable ({e}), using regex fallback")
        return None


async def extract_fields(text: str, selected_fields: list[str]) -> list[dict]:
    """
    Extract fields - tries LLM first, falls back to regex.
    """
    # Try LLM first
    llm_result = await extract_fields_llm(text, selected_fields)
    if llm_result:
        return llm_result

    # Fallback to regex
    return extract_fields_regex(text, selected_fields)


def get_available_fields() -> list[dict]:
    """Return list of all supported fields."""
    return [{"key": k, "label": v["label"]} for k, v in FIELD_PATTERNS.items()]
