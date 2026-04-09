#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
from pathlib import Path

from catalog_job_status import append_event, update_status

DEFAULT_BASE_URL = 'https://self-super-market.vercel.app'


def base_url() -> str:
    return os.environ.get('SELF_SUPER_MARKET_API_BASE_URL', DEFAULT_BASE_URL).rstrip('/')


def curl_json(method: str, url: str, payload: dict | None = None):
    cmd = [
        'curl', '-sS', '-L',
        '-X', method,
        url,
        '-H', 'Accept: application/json',
    ]
    if payload is not None:
        cmd.extend(['-H', 'Content-Type: application/json', '--data-binary', json.dumps(payload, ensure_ascii=False)])
    proc = subprocess.run(cmd, capture_output=True, text=True)
    body = (proc.stdout or '').strip()
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or f'curl failed for {url}')
    if not body:
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return {'raw': body}


def normalize_price(value):
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return max(0, int(round(float(value))))
    s = str(value).strip()
    if not s:
        return 0
    digits = re.sub(r'[^0-9.]', '', s)
    if not digits:
        return 0
    try:
        return max(0, int(round(float(digits))))
    except ValueError:
        return 0


def normalize_stock(quantity, fallback: int = 0) -> int:
    if quantity is None:
        return fallback
    try:
        q = float(quantity)
    except (TypeError, ValueError):
        return fallback
    if q < 0:
        return fallback
    return int(round(q))


def choose_name(result: dict, candidate: dict) -> str:
    return (
        result.get('normalizedName')
        or result.get('cleanName')
        or candidate.get('cleanName')
        or candidate.get('rawName')
        or result.get('rawName')
        or 'Unknown product'
    )


def build_payload(result: dict, candidate: dict, default_stock: int, mode: str) -> dict:
    stock_quantity = default_stock
    if mode == 'stock':
        stock_quantity = normalize_stock(candidate.get('quantity'), fallback=default_stock)
    payload = {
        'name': choose_name(result, candidate),
        'barcode': str(candidate.get('barcode') or result.get('barcode') or '').strip(),
        'price': normalize_price(candidate.get('lineTotal') or candidate.get('unitPrice') or result.get('price')),
        'description': result.get('description') or None,
        'category': result.get('category') or None,
        'stockQuantity': stock_quantity,
        'imageUrl': result.get('imageUrl') or None,
        'imagePublicId': None,
    }
    if payload['price'] <= 0:
        payload['price'] = normalize_price(candidate.get('unitPrice'))
    return payload


def has_minimum_catalog_quality(result: dict, candidate: dict) -> tuple[bool, str]:
    barcode = str(candidate.get('barcode') or result.get('barcode') or '').strip()
    name = choose_name(result, candidate)
    price = normalize_price(candidate.get('lineTotal') or candidate.get('unitPrice') or result.get('price'))
    item_type = candidate.get('itemType') or result.get('itemType')
    status = result.get('status') or ''

    if not barcode or not barcode.isdigit() or len(barcode) not in {12, 13}:
        return False, 'invalid_barcode'
    if item_type == 'weighted':
        return False, 'weighted_item_requires_review'
    if status in {'skipped_internal_weighted_code', 'skipped_unreliable_barcode'}:
        return False, status
    if not name or len(name.strip()) < 4:
        return False, 'missing_name'
    if price <= 0:
        return False, 'missing_price'
    if price >= 1_000_000:
        return False, 'price_too_high'
    return True, 'ok'


def main():
    parser = argparse.ArgumentParser(description='Import enriched receipt candidates into inventory API')
    parser.add_argument('enrichment_json', help='Path to enrichment_results.json')
    parser.add_argument('candidates_json', help='Path to receipt_catalog_candidates.json')
    parser.add_argument('--out', required=True, help='Output json path')
    parser.add_argument('--status', help='Job status json path')
    parser.add_argument('--min-confidence', default='medium', choices=['high', 'medium', 'low'])
    parser.add_argument('--default-stock', type=int, default=1)
    parser.add_argument('--mode', default='catalog', choices=['catalog', 'stock'])
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    confidence_rank = {'low': 0, 'medium': 1, 'high': 2}
    min_rank = confidence_rank[args.min_confidence]

    enrichment = json.loads(Path(args.enrichment_json).read_text(encoding='utf-8'))
    candidates_payload = json.loads(Path(args.candidates_json).read_text(encoding='utf-8'))
    candidates = {str(item.get('barcode') or ''): item for item in candidates_payload.get('productCandidates', [])}
    results = enrichment.get('results', [])

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    status_path = Path(args.status).resolve() if args.status else None

    if status_path:
        update_status(status_path, stage='import', state='running', artifacts={'importOutput': str(out_path)})
        append_event(status_path, 'stage', 'Inventory import started', {'minConfidence': args.min_confidence, 'mode': args.mode, 'dryRun': args.dry_run})

    summary = {
        'totalResults': len(results),
        'eligible': 0,
        'created': 0,
        'updated': 0,
        'skipped': 0,
        'failed': 0,
        'dryRun': args.dry_run,
        'mode': args.mode,
        'minConfidence': args.min_confidence,
        'baseUrl': base_url(),
    }
    actions = []

    for result in results:
        barcode = str(result.get('barcode') or '').strip()
        candidate = candidates.get(barcode, {})
        conf = result.get('matchConfidence', 'low')
        status = result.get('status')

        payload = build_payload(result, candidate, args.default_stock, args.mode)
        quality_ok, quality_reason = has_minimum_catalog_quality(result, candidate)
        conf_rank = confidence_rank.get(conf, 0)
        auto_ok = barcode and quality_ok and status not in {'skipped_internal_weighted_code', 'skipped_unreliable_barcode'} and (conf_rank >= min_rank or (status in {'api_match', 'searched_v2'} and candidate.get('ocrConfidence') == 'high'))

        if not auto_ok:
            summary['skipped'] += 1
            actions.append({
                'barcode': barcode,
                'name': choose_name(result, candidate),
                'action': 'skipped',
                'reason': f'confidence={conf}, status={status}, quality={quality_reason}',
            })
            continue

        summary['eligible'] += 1

        if args.dry_run:
            actions.append({
                'barcode': barcode,
                'name': payload['name'],
                'action': 'dry_run',
                'payload': payload,
            })
            continue

        try:
            existing = curl_json('GET', f"{base_url()}/api/products/barcode/{barcode}")
        except Exception:
            existing = None

        try:
            if existing and isinstance(existing, dict) and existing.get('id'):
                merged_payload = dict(payload)
                existing_stock = normalize_stock(existing.get('stockQuantity'), fallback=0)
                if args.mode == 'stock':
                    merged_payload['stockQuantity'] = existing_stock + payload['stockQuantity']
                else:
                    merged_payload['stockQuantity'] = existing_stock if existing_stock > 0 else payload['stockQuantity']
                merged_payload['id'] = existing['id']
                response = curl_json('PUT', f"{base_url()}/api/products/{existing['id']}", merged_payload)
                summary['updated'] += 1
                actions.append({
                    'barcode': barcode,
                    'name': merged_payload['name'],
                    'action': 'updated',
                    'productId': existing['id'],
                    'payload': merged_payload,
                    'response': response,
                })
            else:
                response = curl_json('POST', f"{base_url()}/api/products", payload)
                summary['created'] += 1
                actions.append({
                    'barcode': barcode,
                    'name': payload['name'],
                    'action': 'created',
                    'payload': payload,
                    'response': response,
                })
        except Exception as exc:
            summary['failed'] += 1
            actions.append({
                'barcode': barcode,
                'name': payload['name'],
                'action': 'failed',
                'payload': payload,
                'error': str(exc),
            })

    output = {
        'merchantName': candidates_payload.get('merchantName'),
        'invoiceDate': candidates_payload.get('invoiceDate'),
        'currency': candidates_payload.get('currency'),
        'summary': summary,
        'actions': actions,
    }
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')

    if status_path:
        update_status(status_path, stage='import', state='completed', summary=summary, artifacts={'importOutput': str(out_path)})
        append_event(status_path, 'done', 'Inventory import completed', summary)

    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
