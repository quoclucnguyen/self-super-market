#!/usr/bin/env python3
import argparse
import html
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote_plus, unquote, urlparse
from urllib.request import Request, urlopen

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
    'world.openfoodfacts.org',
    'openfoodfacts.org',
    'upcitemdb.com',
]

API_SOURCES = [
    'openfoodfacts',
    'upcitemdb',
]

SCRIPT_DIR = Path(__file__).resolve().parent
PLAYWRIGHT_SCRIPT = SCRIPT_DIR / 'playwright_image_search.js'

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


def fetch_json(url: str, timeout_s: float = 8.0):
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urlopen(req, timeout=timeout_s) as resp:
        return json.loads(resp.read().decode('utf-8', errors='replace'))


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


def choose_confidence(score: int) -> str:
    if score >= 8:
        return 'high'
    if score >= 4:
        return 'medium'
    return 'low'


def enrich_from_openfoodfacts(barcode: str, raw_name: str, clean: str, timeout_s: float):
    url = f'https://world.openfoodfacts.org/api/v0/product/{barcode}.json'
    payload = fetch_json(url, timeout_s=timeout_s)
    if payload.get('status') != 1:
        return None
    product = payload.get('product') or {}
    name = product.get('product_name_vi') or product.get('product_name') or clean
    brand = product.get('brands')
    category = product.get('categories')
    image = product.get('image_front_url') or product.get('image_url')
    source_url = product.get('url') or f'https://world.openfoodfacts.org/product/{barcode}'
    score = 6
    if name and any(tok in name.upper() for tok in tokenize(clean)[:3]):
        score += 2
    if brand:
        score += 1
    return {
        'barcode': barcode,
        'rawName': raw_name,
        'cleanName': clean,
        'status': 'api_match',
        'normalizedName': name,
        'brand': brand,
        'category': category,
        'description': product.get('generic_name_vi') or product.get('generic_name'),
        'imageUrl': image,
        'packageSize': product.get('quantity'),
        'matchConfidence': choose_confidence(score),
        'source': 'openfoodfacts',
        'sourceUrls': [source_url],
        'searchResults': [{'title': name, 'url': source_url}],
    }


def enrich_from_upcitemdb(barcode: str, raw_name: str, clean: str, timeout_s: float):
    url = f'https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}'
    payload = fetch_json(url, timeout_s=timeout_s)
    items = payload.get('items') or []
    if not items:
        return None
    item = items[0]
    name = item.get('title') or clean
    category = item.get('category')
    brand = item.get('brand')
    image = (item.get('images') or [None])[0]
    offers = item.get('offers') or []
    source_url = (offers[0].get('link') if offers else None) or f'https://www.upcitemdb.com/upc/{barcode}'
    score = 5
    if name and any(tok in name.upper() for tok in tokenize(clean)[:3]):
        score += 2
    if brand:
        score += 1
    return {
        'barcode': barcode,
        'rawName': raw_name,
        'cleanName': clean,
        'status': 'api_match',
        'normalizedName': name,
        'brand': brand,
        'category': category,
        'description': item.get('description'),
        'imageUrl': image,
        'packageSize': item.get('size'),
        'matchConfidence': choose_confidence(score),
        'source': 'upcitemdb',
        'sourceUrls': [source_url],
        'searchResults': [{'title': name, 'url': source_url}],
    }


def enrich_via_apis(barcode: str, raw_name: str, clean: str, timeout_s: float, api_errors: list[str]):
    for source in API_SOURCES:
        try:
            if source == 'openfoodfacts':
                result = enrich_from_openfoodfacts(barcode, raw_name, clean, timeout_s)
            elif source == 'upcitemdb':
                result = enrich_from_upcitemdb(barcode, raw_name, clean, timeout_s)
            else:
                result = None
            if result:
                return result
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
            api_errors.append(f'{source}: {exc}')
        except Exception as exc:
            api_errors.append(f'{source}: {exc}')
    return None


def enrich_via_playwright(barcode: str, raw_name: str, clean: str, timeout_s: float, errors: list[str]):
    if not PLAYWRIGHT_SCRIPT.exists():
        errors.append('playwright_script_missing')
        return None
    tmp_in = SCRIPT_DIR / '.playwright_image_search_input.json'
    payload = {
        'barcode': barcode,
        'rawName': raw_name,
        'cleanName': clean,
        'timeoutMs': int(timeout_s * 1000),
    }
    tmp_in.write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
    env = dict(os.environ)
    try:
        npm_root = subprocess.check_output(['npm', 'root', '-g'], text=True).strip()
        env['NODE_PATH'] = npm_root + (os.pathsep + env['NODE_PATH'] if env.get('NODE_PATH') else '')
    except Exception:
        pass
    try:
        proc = subprocess.run(
            ['node', str(PLAYWRIGHT_SCRIPT), str(tmp_in)],
            capture_output=True,
            text=True,
            timeout=max(int(timeout_s) + 5, 20),
            env=env,
            check=True,
        )
        data = json.loads(proc.stdout)
        image_url = data.get('imageUrl')
        if not image_url:
            return None
        return {
            'barcode': barcode,
            'rawName': raw_name,
            'cleanName': clean,
            'status': 'browser_image_match',
            'normalizedName': clean,
            'imageUrl': image_url,
            'matchConfidence': 'medium',
            'source': data.get('source') or 'playwright_google_images',
            'sourceUrls': data.get('sourceUrls') or ([image_url] if image_url else []),
            'searchPasses': data.get('searchPasses') or [],
            'searchResults': [],
        }
    except Exception as exc:
        errors.append(f'playwright: {exc}')
        return None
    finally:
        try:
            tmp_in.unlink(missing_ok=True)
        except Exception:
            pass


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

    browser_errors = []
    browser_result = enrich_via_playwright(barcode, raw_name, clean, timeout_s, browser_errors)
    if browser_result:
        return browser_result

    api_errors = []
    api_result = enrich_via_apis(barcode, raw_name, clean, min(timeout_s, 8.0), api_errors)
    if api_result:
        if api_errors:
            api_result['apiErrors'] = api_errors
        if browser_errors:
            api_result['browserErrors'] = browser_errors
        return api_result

    queries = [barcode, f'{barcode} {clean}', clean]
    search_passes = []
    merged = []
    seen = set()
    search_errors = []
    for pass_no, query in enumerate(queries, start=1):
        query_ok = False
        attempts_used = 0
        added_this_pass = 0
        for attempt in range(1, retries + 1):
            attempts_used = attempt
            try:
                before = len(merged)
                for item in ddg_search(query, timeout_s=timeout_s):
                    url = item.get('url')
                    if url and url not in seen:
                        seen.add(url)
                        merged.append(item)
                added_this_pass = len(merged) - before
                query_ok = True
                break
            except Exception as exc:
                search_errors.append(f'query={query} attempt={attempt}: {exc}')
                if attempt < retries:
                    time.sleep(min(1.5 * attempt, 3.0))
        search_passes.append({
            'pass': pass_no,
            'query': query,
            'ok': query_ok,
            'attempts': attempts_used,
            'newResults': added_this_pass,
        })
        if pause_s > 0:
            time.sleep(pause_s)
        if not query_ok and query == barcode:
            continue

    scored = sorted(((score_result(barcode, clean, item), item) for item in merged), key=lambda x: x[0], reverse=True)
    top = [item for _, item in scored[:5]]
    best_score = scored[0][0] if scored else 0
    best = top[0] if top else None
    confidence = choose_confidence(best_score)

    normalized_name = best.get('title') if best and best.get('title') else clean
    out = {
        'barcode': barcode,
        'rawName': raw_name,
        'cleanName': clean,
        'status': 'searched_v2',
        'normalizedName': normalized_name,
        'matchConfidence': confidence,
        'source': 'duckduckgo_fallback',
        'sourceUrls': [item['url'] for item in top if item.get('url')],
        'searchResults': top,
        'searchPasses': search_passes,
    }
    if browser_errors:
        out['browserErrors'] = browser_errors
    if api_errors:
        out['apiErrors'] = api_errors
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
