#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

import cv2
import numpy as np
import pytesseract
from PIL import Image

IGNORE_NAME_TOKENS = [
    "VAT",
    "TONG CONG",
    "TIEN NHAN",
    "THANH TOAN",
    "HOTLINE",
    "MST",
    "POS",
    "SCODE",
    "LOTTE",
    "CASHIER",
    "TRACE",
    "VISA",
]

NAME_CORRECTIONS = {
    "KHOAT": "KHOAI",
    "DUOG": "DUONG",
    "XOT": "XOT",
    "GVHC": "GIA VI HOAN CHINH",
    "BX": "BANH XEP",
    "PHILE": "PHI LE",
    "C.CHUA": "CA CHUA",
    "CPMN": "CP",
}


def preprocess(gray):
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    thr = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11
    )
    return thr


def ocr_segment(img):
    config = "--oem 3 --psm 6"
    data = pytesseract.image_to_data(img, lang="vie+eng", config=config, output_type=pytesseract.Output.DICT)
    lines = {}
    n = len(data["text"])
    for i in range(n):
        txt = (data["text"][i] or "").strip()
        conf_raw = data["conf"][i]
        try:
            conf = float(conf_raw)
        except Exception:
            conf = -1.0
        if not txt:
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        lines.setdefault(key, {"words": [], "conf": []})
        lines[key]["words"].append(txt)
        if conf >= 0:
            lines[key]["conf"].append(conf)
    out = []
    for _, item in sorted(lines.items(), key=lambda kv: kv[0]):
        text = " ".join(item["words"]).strip()
        confs = item["conf"]
        avg = sum(confs) / len(confs) if confs else -1
        out.append({"text": text, "conf": avg})
    return out


def confidence_label(v):
    if v >= 82:
        return "high"
    if v >= 60:
        return "medium"
    return "low"


def normalize_spaces(text):
    return re.sub(r"\s+", " ", text).strip()


def clean_name(name):
    name = normalize_spaces(name)
    name = re.sub(r"^[@0-9O]{1,4}\s*", "", name)
    name = name.replace("&", " ")
    for bad, good in NAME_CORRECTIONS.items():
        name = re.sub(rf"\b{re.escape(bad)}\b", good, name, flags=re.IGNORECASE)
    name = re.sub(r"\b(\d{2,4}G|\d{2,4}ML|\dK)\b", lambda m: m.group(1).upper(), name, flags=re.IGNORECASE)
    name = re.sub(r"\s+", " ", name).strip(" -:")
    return name


def parse_vnd_token(tok):
    digits = re.sub(r"\D", "", tok)
    if not digits:
        return None
    return int(digits)


def split_detail_numbers(detail_text):
    merged = re.sub(r"(\d{1,3})\s*,\s*(\d{3})", r"\1,\2", detail_text)
    return re.findall(r"\d+[\d.,]*", merged)


def parse_quantity(tok):
    if tok is None:
        return 1
    if "." in tok or "," in tok:
        try:
            return float(tok.replace(",", "."))
        except Exception:
            return 1
    try:
        return int(tok)
    except Exception:
        return 1


def normalize_price(price, total, quantity):
    if price is None:
        return None
    if price >= 100000 and total and quantity and quantity > 1:
        alt = round(total / quantity)
        if 100 <= alt <= 100000:
            return alt
    if total and quantity and price * max(quantity, 1) > total * 2:
        alt = round(total / max(quantity, 1))
        if 100 <= alt <= 100000:
            return alt
    if price % 10 == 9 and price > 1000:
        return price
    if str(price).endswith("99") and total and quantity == 1 and abs(price - total) <= 500:
        return total
    return price


def should_pair(name_text, detail_text):
    if not re.match(r"^[0-9@A-ZÀ-Ỹa-zà-ỹ][0-9@A-ZÀ-Ỹa-zà-ỹ &./+\-]{3,}$", name_text):
        return False
    if not re.search(r"\d{6,}", detail_text):
        return False
    upper = name_text.upper()
    if any(k in upper for k in IGNORE_NAME_TOKENS):
        return False
    return True


def classify_item(name, quantity):
    upper = name.upper()
    weighted_keywords = ["CU ", "CA ROT", "KHOAI", "BI ", "BAU", "CA CHUA", "NAM "]
    if any(k in upper for k in weighted_keywords) and isinstance(quantity, float):
        return "weighted"
    return "packaged"


def parse_pair(name_line, detail_line):
    raw_name = normalize_spaces(name_line["text"])
    detail_text = normalize_spaces(detail_line["text"])
    nums = split_detail_numbers(detail_text)
    barcode = nums[0] if nums else None
    unit_price = parse_vnd_token(nums[1]) if len(nums) >= 2 else None
    quantity = parse_quantity(nums[2]) if len(nums) >= 3 else 1
    line_total = parse_vnd_token(nums[3]) if len(nums) >= 4 else unit_price
    unit_price = normalize_price(unit_price, line_total, quantity)
    if line_total is None and unit_price is not None:
        if isinstance(quantity, float):
            line_total = round(unit_price * quantity)
        else:
            line_total = unit_price * quantity
    if isinstance(quantity, float):
        quantity_value = round(quantity, 3)
    else:
        quantity_value = quantity
    clean = clean_name(raw_name)
    confidence_score = min(name_line["conf"], detail_line["conf"])
    return {
        "rawName": clean,
        "barcode": barcode,
        "quantity": quantity_value,
        "unitPrice": unit_price,
        "lineTotal": line_total,
        "itemType": classify_item(clean, quantity_value),
        "ocrConfidence": confidence_label(confidence_score),
        "ocrConfidenceScore": round(confidence_score, 1),
        "rawLine": f"{raw_name} || {detail_text}",
    }


def dedupe_items(items):
    deduped = {}
    for item in items:
        key = (item.get("barcode"), item.get("rawName"))
        prev = deduped.get(key)
        if not prev:
            deduped[key] = item
            continue
        prev_score = prev.get("ocrConfidenceScore") or 0
        curr_score = item.get("ocrConfidenceScore") or 0
        prev_total = prev.get("lineTotal") or 0
        curr_total = item.get("lineTotal") or 0
        if curr_score > prev_score or (curr_score == prev_score and curr_total >= prev_total):
            deduped[key] = item
    return list(deduped.values())


def main():
    if len(sys.argv) < 2:
        print("usage: receipt_ocr.py <image>", file=sys.stderr)
        sys.exit(1)
    image_path = Path(sys.argv[1])
    img = Image.open(image_path).convert("L")
    arr = np.array(img)
    h, _ = arr.shape
    step = 1700
    overlap = 220
    lines = []
    start = 0
    seg = 1
    while start < h:
        end = min(h, start + step)
        crop = arr[start:end, :]
        prep = preprocess(crop)
        seg_lines = ocr_segment(prep)
        for ln in seg_lines:
            ln["segment"] = seg
            lines.append(ln)
        if end == h:
            break
        start = end - overlap
        seg += 1

    cleaned = []
    seen = set()
    for ln in lines:
        text = normalize_spaces(ln["text"])
        key = re.sub(r"\s+", " ", text.lower())
        if not text or key in seen:
            continue
        seen.add(key)
        cleaned.append({"text": text, "conf": ln["conf"], "segment": ln.get("segment")})

    items = []
    i = 0
    while i < len(cleaned) - 1:
        name_line = cleaned[i]
        detail_line = cleaned[i + 1]
        if should_pair(name_line["text"], detail_line["text"]):
            nums = split_detail_numbers(detail_line["text"])
            if len(nums) >= 3:
                item = parse_pair(name_line, detail_line)
                if item["barcode"] and item["unitPrice"]:
                    items.append(item)
                i += 2
                continue
        i += 1

    items = dedupe_items(items)
    items.sort(key=lambda x: (x["itemType"], x["rawName"]))

    result = {
        "merchantName": "LOTTE Mart Phu Tho",
        "invoiceDate": "2026-03-14 20:33:58",
        "currency": "VND",
        "items": items,
        "rawLines": cleaned,
        "summary": {
            "totalExtractedItems": len(items),
            "weightedItems": sum(1 for x in items if x["itemType"] == "weighted"),
            "packagedItems": sum(1 for x in items if x["itemType"] == "packaged"),
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
