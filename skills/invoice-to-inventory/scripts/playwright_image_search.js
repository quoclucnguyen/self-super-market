#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
process.env.NODE_PATH = process.env.NODE_PATH || '';
try { require('module').Module._initPaths(); } catch {}
const { chromium } = require('playwright');

function cleanName(name) {
  return String(name || '').toUpperCase().replace(/\s+/g, ' ').trim();
}

function buildQueries(barcode, clean) {
  const queries = [];
  if (barcode) queries.push(barcode);
  if (barcode && clean) queries.push(`${barcode} ${clean}`);
  if (clean) queries.push(clean);
  return queries.slice(0, 3);
}

function pickImage(images) {
  const bad = /(logo|icon|sprite|avatar|banner|placeholder|thumb|thumbnail)/i;
  const good = images
    .filter(Boolean)
    .filter(img => img.url && /^https?:\/\//.test(img.url))
    .filter(img => !bad.test(img.url) && !bad.test(img.alt || ''))
    .sort((a, b) => (b.area || 0) - (a.area || 0));
  return good[0] || null;
}

async function collectImagesFromPage(page, maxImages = 20) {
  return await page.evaluate((limit) => {
    const imgs = Array.from(document.images || []).map(img => ({
      url: img.currentSrc || img.src || '',
      alt: img.alt || '',
      width: img.naturalWidth || img.width || 0,
      height: img.naturalHeight || img.height || 0,
      area: (img.naturalWidth || img.width || 0) * (img.naturalHeight || img.height || 0),
    }));
    return imgs.filter(x => x.url).slice(0, limit);
  }, maxImages);
}

async function searchOne(page, query, timeoutMs) {
  const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForTimeout(1200);
  const title = await page.title().catch(() => '');
  const images = await collectImagesFromPage(page, 50);
  return { query, title, images };
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: playwright_image_search.js <input.json>');
    process.exit(2);
  }
  const input = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
  const barcode = String(input.barcode || '').trim();
  const rawName = String(input.rawName || '').trim();
  const clean = cleanName(input.cleanName || rawName);
  const queries = buildQueries(barcode, clean);
  const timeoutMs = Number(input.timeoutMs || 20000);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const passes = [];
  let chosen = null;

  try {
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      try {
        const result = await searchOne(page, query, timeoutMs);
        const picked = pickImage(result.images);
        passes.push({
          pass: i + 1,
          query,
          ok: true,
          imageCount: result.images.length,
          title: result.title,
          selectedImage: picked ? picked.url : null,
        });
        if (!chosen && picked) {
          chosen = picked;
        }
      } catch (err) {
        passes.push({
          pass: i + 1,
          query,
          ok: false,
          error: String(err && err.message || err),
          imageCount: 0,
          selectedImage: null,
        });
      }
      if (chosen) break;
    }
  } finally {
    await browser.close();
  }

  const out = {
    barcode,
    rawName,
    cleanName: clean,
    imageUrl: chosen ? chosen.url : null,
    imageMeta: chosen,
    searchPasses: passes,
    source: 'playwright_google_images',
    sourceUrls: chosen ? [chosen.url] : [],
  };
  process.stdout.write(JSON.stringify(out, null, 2));
}

main().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});
