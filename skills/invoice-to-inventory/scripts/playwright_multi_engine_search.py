#!/usr/bin/env python3
import asyncio
import json
import sys
from pathlib import Path
from urllib.parse import urlencode

from playwright.async_api import async_playwright


def clean(text: str) -> str:
    return ' '.join(str(text or '').split())


async def collect_duckduckgo(page):
    return await page.eval_on_selector_all(
        'a.result__a',
        "els => els.slice(0, 8).map(a => ({title: (a.textContent || '').trim(), url: a.href || ''}))",
    )


async def collect_bing(page):
    return await page.eval_on_selector_all(
        'li.b_algo h2 a',
        "els => els.slice(0, 8).map(a => ({title: (a.textContent || '').trim(), url: a.href || ''}))",
    )


async def collect_google(page):
    return await page.eval_on_selector_all(
        'a h3',
        "els => els.slice(0, 8).map(h3 => { const a = h3.closest('a'); return {title: (h3.textContent || '').trim(), url: a ? (a.href || '') : ''}; })",
    )


async def search_engine(page, engine: str, query: str, timeout_ms: int):
    urls = {
        'duckduckgo': 'https://duckduckgo.com/html/?' + urlencode({'q': query}),
        'bing': 'https://www.bing.com/search?' + urlencode({'q': query}),
        'google': 'https://www.google.com/search?' + urlencode({'q': query}),
    }
    collectors = {
        'duckduckgo': collect_duckduckgo,
        'bing': collect_bing,
        'google': collect_google,
    }
    await page.goto(urls[engine], wait_until='domcontentloaded', timeout=timeout_ms)
    await page.wait_for_timeout(1500)
    raw = await collectors[engine](page)
    out = []
    for item in raw:
        title = clean(item.get('title'))
        url = clean(item.get('url'))
        if title and url.startswith('http'):
            out.append({'title': title, 'url': url, 'engine': engine})
    cleaned = []
    for item in out:
        url = item.get('url') or ''
        if 'bing.com/ck/a?' in url:
            # let browser resolve redirect for cleaner downstream crawl targets
            try:
                temp = await page.context.new_page()
                await temp.goto(url, wait_until='domcontentloaded', timeout=timeout_ms)
                final_url = temp.url
                await temp.close()
                item['url'] = final_url or url
            except Exception:
                item['url'] = url
        cleaned.append(item)
    return cleaned


async def main_async(payload: dict):
    queries = payload.get('queries') or []
    timeout_ms = int(payload.get('timeoutMs') or 15000)
    results = []
    search_passes = []
    seen = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1366, 'height': 900})
        try:
            for idx, query in enumerate(queries, start=1):
                engine_attempts = []
                pass_results = []
                engine_used = None
                for engine in ['duckduckgo', 'bing', 'google']:
                    try:
                        found = await search_engine(page, engine, query, timeout_ms)
                        engine_attempts.append({'engine': engine, 'ok': True, 'count': len(found)})
                        if found:
                            pass_results = found
                            engine_used = engine
                            break
                    except Exception as exc:
                        engine_attempts.append({'engine': engine, 'ok': False, 'count': 0, 'error': str(exc)})
                new_results = 0
                for item in pass_results:
                    if item['url'] not in seen:
                        seen.add(item['url'])
                        results.append(item)
                        new_results += 1
                search_passes.append({
                    'pass': idx,
                    'query': query,
                    'ok': new_results > 0,
                    'engine': engine_used,
                    'newResults': new_results,
                    'engineAttempts': engine_attempts,
                })
                if new_results > 0:
                    break
        finally:
            await browser.close()

    return {'results': results, 'searchPasses': search_passes}


def main():
    input_path = Path(sys.argv[1])
    payload = json.loads(input_path.read_text(encoding='utf-8'))
    out = asyncio.run(main_async(payload))
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
