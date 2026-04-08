#!/usr/bin/env python3
import argparse
import html
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

from catalog_job_status import append_event, update_status

PREFERRED_DOMAINS = [
    'lottemart.vn',
    'bachhoaxanh.com',
    'winmart.vn',
    'cooponline.vn',
    'acecookvietnam.vn',
    'masanconsumer.com',
    'dhfoods.com.vn',
    'cpfoods.vn',
    'barona.vn',
    'cautre.com.vn',
    'takyfood.com',
]

NAME_FIXES = {
    'KHOAT': 'KHOAI',
    'DUOG': 'DUONG',
    'F00DS': 'FOODS',
    'GVHC': 'GIA VI HOAN CHINH',
    'BX': 'BANH XEP',
    'PHILE': 'PHI LE',
    'C.CHUA': 'CA CHUA',
    'CH.GION': 'CHIEN GION',
    'G.VI': 'GIA VI',
    'T.P': 'THAP CAM',
    'H.SAN': 'HAI SAN',
    'PMAI': 'PHO MAI',
}


def unwrap_ddg(url: str) -> str:
    if url.startswith('//'):
        url = 'https:' + url
    if 'duckduckgo.com/l/?' in url:
        q = parse_qs(urlparse(url).query)
        if 'uddg' in q:
            return unquote(q['uddg'][0])
    return url


def curl(url: str, timeout_s: float = 12.0) -> str:
    return subprocess.check_output(
        [
            'curl',
            '-A', 'Mozilla/5.0',
            '-L',
            '--max-time', str(int(timeout_s)),
            '--connect-timeout', '5',
            '-sS',
            url,
        ],
        text=True,
        timeout=max(int(timeout_s) + 2, 8),
        stderr=subprocess.DEVNULL,
    )


def ddg_search(query: str, limit: int = 8, timeout_s: float = 12.0):
    body = curl('https://html.duckduckgo.com/html/?q=' + quote_plus(query), timeout_s=timeout_s)
    results = []
    for m in re.finditer(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', body, re.S):
        href = unwrap_ddg(m.group(1))
        title = re.sub(r'<.*?>', ' ', m.group(2))
        title = html.unescape(re.sub(r'\s+', ' ', title).strip())
        results.append({'title': title, 'url': href})
        if len(results) >= limit:
            break
    return results


def clean_name(name: str) -> str:
    s = name.upper()
    s = s.replace('@@', '0').replace('@', '0')
    for bad, good in NAME_FIXES.items():
        s = re.sub(rf'\b{re.escape(bad)}\b', good, s)
    s = re.sub(r'\b(\d{2,4})096\b', r'\1G', s)
    s = re.sub(r'\b(\d{2,4})06\b', r'\1G', s)
    s = re.sub(r'\b(\d{2,4})6\b', lambda m: m.group(1) + 'G' if 2 <= len(m.group(1)) <= 3 else m.group(0), s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def tokenize(text: str):
    return [t for t in re.findall(r'[A-Z0-9]+', text.upper()) if len(t) >= 2]


def is_weighted_internal(candidate: dict) -> bool:
    barcode = str(candidate.get('barcode') or '')
    return candidate.get('itemType') == 'weighted' and barcode[:2] in {str(x) for x in range(20, 30)}


def looks_internal_or_unreliable_barcode(candidate: dict) -> bool:
    barcode = str(candidate.get('barcode') or '')
    raw_name = str(candidate.get('rawName') or '')
    if not barcode.isdigit():
        return True
    if len(barcode) not in {12, 13}:
        return True
    if barcode.startswith('0'):
        return True
    if candidate.get('itemType') == 'weighted' and barcode[:2] in {str(x) for x in range(20, 30)}:
        return True
    if raw_name and re.fullmatch(r'[A-Z\s]+\d{2,4}G?', clean_name(raw_name)) and barcode.startswith('04'):
        return True
    return False


def score_result(barcode: str, clean: str, result: dict) -> int:
    title = (result.get('title') or '').upper()
    url = result.get('url') or ''
    tokens = tokenize(clean)
    score = 0
    if barcode and (barcode in title or barcode in url):
        score += 5
    score += sum(1 for tok in tokens if len(tok) >= 3 and tok in title)
    if any(domain in url for domain in PREFERRED_DOMAINS):
        score += 2
    return score


def enrich_candidate(candidate: dict, pause_s: float, timeout_s: float, retries: int):
    barcode = str(candidate.get('barcode') or '')
    raw_name = candidate.get('rawName') or ''
    clean = clean_name(raw_name)

    if is_weighted_internal(candidate):
        return {
            'barcode': barcode,
            'rawName': raw_name,
            'cleanName': clean,
            'status': 'skipped_internal_weighted_code',
            'matchConfidence': 'low',
            'sourceUrls': [],
            'notes': 'Likely supermarket internal weighted produce code.',
        }

    if looks_internal_or_unreliable_barcode(candidate):
        return {
            'barcode': barcode,
            'rawName': raw_name,
            'cleanName': clean,
            'status': 'skipped_unreliable_barcode',
            'matchConfidence': 'low',
            'sourceUrls': [],
            'notes': 'Barcode looks internal, malformed, or unreliable for catalog enrichment.',
        }

    queries = [barcode, f'{barcode} {clean}']

    merged = []
    seen = set()
    search_errors = []
    for query in queries:
        query_ok = False
        for attempt in range(1, retries + 1):
            try:
                for item in ddg_search(query, timeout_s=timeout_s):
                    url = item.get('url')
                    if url and url not in seen:
                        seen.add(url)
                        merged.append(item)
                query_ok = True
                break
            except Exception as exc:
                search_errors.append(f'query={query} attempt={attempt}: {exc}')
                if attempt < retries:
                    time.sleep(min(1.5 * attempt, 3.0))
        if pause_s > 0:
            time.sleep(pause_s)
        if not query_ok and query == barcode:
            continue

    scored = sorted(((score_result(barcode, clean, item), item) for item in merged), key=lambda x: x[0], reverse=True)
    top = [item for _, item in scored[:5]]
    best_score = scored[0][0] if scored else 0
    best = top[0] if top else None

    if best_score >= 8:
        confidence = 'high'
    elif best_score >= 4:
        confidence = 'medium'
    else:
        confidence = 'low'

    normalized_name = best.get('title') if best and best.get('title') else clean
    out = {
        'barcode': barcode,
        'rawName': raw_name,
        'cleanName': clean,
        'status': 'searched_v2',
        'normalizedName': normalized_name,
        'matchConfidence': confidence,
        'sourceUrls': [item['url'] for item in top if item.get('url')],
        'searchResults': top,
    }
    if search_errors:
        out['searchErrors'] = search_errors
    return out


def summarize(results):
    summary = {
        'total': len(results),
        'ready': 0,
        'ambiguous': 0,
        'failed': 0,
        'skippedInternalWeighted': 0,
        'skippedUnreliableBarcode': 0,
    }
    for item in results:
        status = item.get('status')
        conf = item.get('matchConfidence')
        if status == 'skipped_internal_weighted_code':
            summary['skippedInternalWeighted'] += 1
        elif status == 'skipped_unreliable_barcode':
            summary['skippedUnreliableBarcode'] += 1
        elif conf == 'high':
            summary['ready'] += 1
        elif conf == 'medium':
            summary['ambiguous'] += 1
        else:
            summary['failed'] += 1
    return summary


def main():
    parser = argparse.ArgumentParser(description='Enrich receipt catalog candidates with web search and checkpoints')
    parser.add_argument('candidates_json', help='Path to receipt_catalog_candidates.json')
    parser.add_argument('--out', required=True, help='Output json path')
    parser.add_argument('--status', help='Job status json path')
    parser.add_argument('--checkpoint-every', type=int, default=8, help='Write partial output every N processed candidates')
    parser.add_argument('--pause', type=float, default=0.35, help='Pause between queries in seconds')
    parser.add_argument('--query-timeout', type=float, default=12.0, help='Per-query timeout in seconds')
    parser.add_argument('--retries', type=int, default=2, help='Retries per query before giving up')
    args = parser.parse_args()

    src = Path(args.candidates_json)
    out = Path(args.out)
    status_path = Path(args.status).resolve() if args.status else None
    payload = json.loads(src.read_text(encoding='utf-8'))
    candidates = payload.get('productCandidates', [])

    results = []
    done_barcodes = set()
    if out.exists():
        try:
            existing = json.loads(out.read_text(encoding='utf-8'))
            results = existing.get('results', []) or []
            done_barcodes = {str(item.get('barcode') or '') for item in results if item.get('barcode')}
        except Exception:
            results = []
            done_barcodes = set()
    out.parent.mkdir(parents=True, exist_ok=True)
    if status_path:
        update_status(
            status_path,
            stage='enrichment',
            state='running',
            progress={'processed': len(done_barcodes), 'total': len(candidates)},
            summary=summarize(results),
            artifacts={'enrichmentOutput': str(out)},
        )
        append_event(status_path, 'stage', 'Enrichment started', {'processed': len(done_barcodes), 'total': len(candidates)})

    processed = len(done_barcodes)
    for candidate in candidates:
        barcode = str(candidate.get('barcode') or '')
        if barcode in done_barcodes:
            continue
        result = enrich_candidate(candidate, args.pause, args.query_timeout, args.retries)
        results.append(result)
        done_barcodes.add(barcode)
        processed += 1
        if processed % args.checkpoint_every == 0 or processed == len(candidates):
            checkpoint = {
                'merchantName': payload.get('merchantName'),
                'invoiceDate': payload.get('invoiceDate'),
                'currency': payload.get('currency'),
                'mode': 'catalog_enrichment',
                'progress': {
                    'processed': processed,
                    'total': len(candidates),
                },
                'summary': summarize(results),
                'results': results,
            }
            out.write_text(json.dumps(checkpoint, ensure_ascii=False, indent=2), encoding='utf-8')
            if status_path:
                update_status(
                    status_path,
                    stage='enrichment',
                    state='running',
                    progress={'processed': processed, 'total': len(candidates)},
                    summary=checkpoint['summary'],
                    artifacts={'enrichmentOutput': str(out)},
                )
                append_event(status_path, 'checkpoint', f'Enrichment progress {processed}/{len(candidates)}', checkpoint['summary'])
            print(f'progress {processed}/{len(candidates)}', flush=True)

    if status_path:
        update_status(
            status_path,
            stage='enrichment',
            state='completed',
            progress={'processed': len(candidates), 'total': len(candidates)},
            summary=summarize(results),
            artifacts={'enrichmentOutput': str(out)},
        )
        append_event(status_path, 'done', 'Enrichment completed', summarize(results))
    print(f'done {len(candidates)}', flush=True)


if __name__ == '__main__':
    main()
