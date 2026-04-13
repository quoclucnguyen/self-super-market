#!/usr/bin/env python3
import asyncio
import contextlib
import io
import json
import re
import sys
from pathlib import Path

from crawl4ai import AsyncWebCrawler

BAD_RE = re.compile(r'logo|icon|avatar|banner|placeholder|sprite|thumb|thumbnail', re.I)


def tokenize(text: str):
    return [t for t in re.findall(r'[A-Z0-9]+', (text or '').upper()) if len(t) >= 2]


def score_candidate(img: dict, clean_name: str, preferred_domains: list[str]) -> int:
    url = str(img.get('url') or '')
    alt = str(img.get('alt') or '')
    title = str(img.get('pageTitle') or '')
    joined = f'{url} {alt} {title}'.upper()
    score = 0
    if BAD_RE.search(joined):
        score -= 8
    area = int(img.get('area') or 0)
    if area >= 200_000:
        score += 4
    elif area >= 60_000:
        score += 2
    tokens = tokenize(clean_name)[:5]
    score += sum(2 for tok in tokens if tok in joined)
    if any(domain in url for domain in preferred_domains):
        score += 5
    return score


async def crawl_one(crawler: AsyncWebCrawler, url: str):
    result = await crawler.arun(url)
    if not result.success:
        return {'url': url, 'success': False, 'images': [], 'title': ''}
    images = []
    media = getattr(result, 'media', {}) or {}
    for img in media.get('images', []) or []:
        src = img.get('src') or img.get('url')
        if not src:
            continue
        width = int(img.get('width') or 0)
        height = int(img.get('height') or 0)
        images.append({
            'url': src,
            'alt': img.get('alt') or '',
            'width': width,
            'height': height,
            'area': width * height,
            'pageUrl': url,
            'pageTitle': (getattr(result, 'metadata', {}) or {}).get('title') or '',
        })
    return {
        'url': url,
        'success': True,
        'images': images,
        'title': (getattr(result, 'metadata', {}) or {}).get('title') or '',
    }


async def main_async(payload: dict):
    urls = payload.get('urls') or []
    clean_name = payload.get('cleanName') or payload.get('rawName') or ''
    preferred_domains = payload.get('preferredDomains') or []
    search_passes = [
        {'pass': idx + 1, 'query': url, 'ok': True, 'kind': 'crawl_target'} for idx, url in enumerate(urls)
    ]
    crawled = []
    sink = io.StringIO()
    with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
        async with AsyncWebCrawler() as crawler:
            for url in urls:
                try:
                    crawled.append(await crawl_one(crawler, url))
                except Exception as exc:
                    crawled.append({'url': url, 'success': False, 'error': str(exc), 'images': [], 'title': ''})

    candidates = []
    for page in crawled:
        for img in page.get('images', []):
            img['score'] = score_candidate(img, clean_name, preferred_domains)
            candidates.append(img)

    candidates.sort(key=lambda x: x.get('score', 0), reverse=True)
    best = candidates[0] if candidates and candidates[0].get('score', 0) > 0 else None

    return {
        'normalizedName': clean_name,
        'bestPageUrl': best.get('pageUrl') if best else None,
        'bestImage': best,
        'imageCandidates': candidates[:10],
        'searchPasses': search_passes,
        'crawledPages': crawled,
    }


def main():
    input_path = Path(sys.argv[1])
    payload = json.loads(input_path.read_text(encoding='utf-8'))
    out = asyncio.run(main_async(payload))
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
