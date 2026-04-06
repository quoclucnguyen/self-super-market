#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def load_items(path: Path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data


def choose_best(items):
    best = {}
    for item in items:
        barcode = item.get('barcode')
        if not barcode:
            continue
        prev = best.get(barcode)
        if not prev:
            best[barcode] = item
            continue
        prev_score = prev.get('ocrConfidenceScore') or 0
        curr_score = item.get('ocrConfidenceScore') or 0
        prev_name = prev.get('rawName', '')
        curr_name = item.get('rawName', '')
        prev_len = len(prev_name)
        curr_len = len(curr_name)
        if curr_score > prev_score or (curr_score == prev_score and curr_len >= prev_len):
            best[barcode] = item
    return list(best.values())


def build_candidate(item):
    return {
        'barcode': item.get('barcode'),
        'rawName': item.get('rawName'),
        'itemType': item.get('itemType'),
        'ocrConfidence': item.get('ocrConfidence'),
        'ocrConfidenceScore': item.get('ocrConfidenceScore'),
        'searchQueries': [
            item.get('barcode'),
            f"{item.get('barcode')} {item.get('rawName')}",
            item.get('rawName'),
        ],
        'rawLine': item.get('rawLine'),
    }


def main():
    if len(sys.argv) < 2:
        print('usage: receipt_catalog_candidates.py <receipt_ocr_output.json>', file=sys.stderr)
        sys.exit(1)
    src = Path(sys.argv[1])
    data = load_items(src)
    items = data.get('items', [])
    chosen = choose_best(items)
    chosen.sort(key=lambda x: x.get('rawName', ''))
    out = {
        'merchantName': data.get('merchantName'),
        'invoiceDate': data.get('invoiceDate'),
        'currency': data.get('currency'),
        'mode': 'catalog_enrichment',
        'productCandidates': [build_candidate(x) for x in chosen],
        'summary': {
            'sourceItems': len(items),
            'uniqueBarcodes': len(chosen),
        },
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
