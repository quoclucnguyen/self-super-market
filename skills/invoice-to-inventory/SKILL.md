---
name: invoice-to-inventory
description: Extract products from invoice images, enrich missing product fields, then create or update inventory via Self Super Market API.
metadata:
  openclaw:
    requires:
      bins: ["curl", "python3"]
---

# Invoice to Inventory (Telegram -> Self Super Market)

Use this skill when the user sends an invoice/receipt image (often from Telegram) and asks to import items into inventory.

## Inputs

- Required: at least one invoice/receipt image.
- Optional hints: merchant name, language, country, currency.

If no image is attached, ask the user to upload a clearer image first.

## Goal

Support two related modes:

1. **stock import mode**
   - Convert receipt line items into inventory/product updates with quantity and price.
2. **catalog enrichment mode**
   - Treat the receipt as a source of product discovery.
   - Prioritize `barcode` + correct product identity.
   - Enrich from the web to obtain normalized name, image, brand, category, description, and package size.
   - Quantity and line totals are secondary or ignorable in this mode.

Target system payloads typically end up at:
- `POST /api/products`
- `PUT /api/products/{id}`

using:
- `openapi-spec.json`
- `drizzle/schema.ts` (`products` table)

## Quality bar

1. Prefer correctness over speed.
2. Return structured data for every extracted line item.
3. If OCR/barcode confidence is low, request confirmation before writing.

## Skill layout

Recommended files inside this skill directory:
- `scripts/receipt_ocr.py` — OCR + line extraction for long receipt images
- `scripts/receipt_catalog_candidates.py` — reduce OCR output into unique barcode candidates for enrichment
- `scripts/run_catalog_flow.py` — orchestrate receipt -> OCR -> candidate generation -> enrichment batch manifests
- `examples/receipt_ocr_output.sample.json` — sample OCR output
- `examples/receipt_catalog_candidates.sample.json` — sample catalog-candidate output
- `examples/raw_lines_dump.sample.txt` — optional OCR debug dump
- `runs/` — generated outputs for real executions

## Workflow

### Recommended end-to-end flow for product-catalog ingestion

Use this flow when the user wants the receipt to become a **product knowledge source** rather than a stock-count event.

1. **Receipt OCR / candidate extraction**
   - Run local OCR on the receipt image.
   - Preferred script: `scripts/receipt_ocr.py <receipt-image>`
   - Extract mainly:
     - `barcode`
     - `rawName`
     - `ocrConfidence`
     - `rawLine`
   - Ignore quantity and line totals if they are noisy and not needed.

2. **Candidate dedupe**
   - Collapse repeated detections from overlapping OCR segments.
   - Keep the best candidate per barcode.
   - Produce a compact candidate list for enrichment.
   - Preferred script: `scripts/receipt_catalog_candidates.py <receipt_ocr_output.json>`

3. **Web enrichment**
   - Search by barcode first.
   - If needed, search by `barcode + cleanedName`.
   - If still needed, search by `cleanedName`.
   - Prefer official brand pages, then major retailers, then trusted barcode/product databases.
   - Skip likely supermarket internal weighted-produce codes early instead of wasting internet lookups.
   - Write checkpoints every few items so long jobs always leave usable partial output.

4. **Batching / execution strategy**
   - Always create enrichment batches for auditability and optional parallelization.
   - Default execution should still continue automatically in-process unless the user asked to pause.
   - Use sub-agents only when the receipt is very large or the local enrichment strategy is clearly insufficient.
   - Do not spawn one sub-agent per product unless the total list is very small.

5. **Checkpoint + job status reporting**
   - For any run longer than about 1-2 minutes, emit progress updates at stage boundaries and every checkpoint batch.
   - Maintain `job_status.json` with at least:
     - `jobId`
     - `state` (`running | completed | failed`)
     - `stage`
     - `progress`
     - `summary`
     - `artifacts`
     - recent `events`
   - Never go silent during a long run if there is fresh progress to report.
   - Partial outputs must be usable even if the process is interrupted.

6. **Merge enriched results**
   - Combine all enrichment results.
   - Resolve conflicts by source quality and confidence.
   - Keep `sourceUrls` for audit.

7. **Preview for confirmation**
   - Show grouped results:
     - confident catalog-ready items
     - ambiguous items
     - failed lookups

8. **Import into product system**
   - Create/update product records using enriched identity data.
   - In this mode, `stockQuantity` and receipt `lineTotal` do not need to block import.

Recommended one-shot command for this flow:
- `python3 scripts/run_catalog_flow.py <receipt-image> --out-dir runs/<run-name> --batch-size 8`

Default behavior should be fully automatic for catalog enrichment:
1. run OCR
2. build unique barcode candidates
3. write enrichment batches for audit/review
4. run local web enrichment automatically
5. write checkpointed partial results during long runs
6. maintain a persistent `job_status.json` with stage, state, progress, artifacts, summary, and recent events
7. finish with a machine-readable summary grouped into `ready`, `ambiguous`, `failed`, and `skippedInternalWeighted`

This command should produce at least:
- `runs/<run-name>/receipt_ocr_output.json`
- `runs/<run-name>/receipt_catalog_candidates.json`
- `runs/<run-name>/enrichment_batch_XX.json`
- `runs/<run-name>/enrichment_results.json`
- `runs/<run-name>/catalog_flow_manifest.json`
- `runs/<run-name>/job_status.json`

If the user explicitly wants only OCR/candidates, use:
- `python3 scripts/run_catalog_flow.py <receipt-image> --out-dir runs/<run-name> --skip-enrichment`

### 1) Extract structured fields from image (vision/OCR)

Preferred local pipeline for long receipt images:
1. Load image with Python (`Pillow`) and convert to grayscale.
2. Split tall receipts into overlapping vertical segments.
3. Preprocess each segment with OpenCV (denoise + adaptive threshold).
4. OCR each segment with `pytesseract` using `lang="vie+eng"` and `--oem 3 --psm 6`.
5. Reconstruct lines from `image_to_data()` output.
6. Pair product-name line with following numeric detail line.
7. Dedupe duplicate detections across overlapping segments.
8. Produce a preview before any write.

Extract:
- `merchantName`
- `invoiceDate`
- `currency`
- `items[]`:
  - `rawName`
  - `barcode` (if present from OCR)
  - `quantity`
  - `unitPrice`
  - `lineTotal`
  - `itemType` (`weighted | packaged`)
  - `ocrConfidence` (`high | medium | low`)

Normalization:
- Long receipts should be auto-segmented instead of immediately asking user to crop manually.
- Weighted produce may have decimal quantity (for example `0.885`, `1.490`, `9,345`). Do **not** force these to integer stock until confirmation.
- Merge split VND tokens like `19, 900` -> `19,900`.
- If missing `lineTotal`, compute from `unitPrice * quantity`.
- Clean noisy product-name fragments (promo text, leading item indexes like `@35`, duplicate spaces, OCR confusions such as `KHOAT -> KHOAI` when obvious).
- Keep `rawLine` for audit/debug.

### 2) Enrich product identity from web sources

For **catalog enrichment mode**, the preferred minimal OCR output is:
- `barcode`
- `rawName`
- `ocrConfidence`
- `rawLine`

Then enrich each candidate using web search.

Per item, try to infer or verify:
- `barcode` (highest priority; verify OCR when possible)
- `normalizedName`
- `brand`
- `category`
- `description`
- `imageUrl`
- `packageSize`
- `sourceUrls[]`
- `matchConfidence`

Search order:
1. exact barcode via barcode/product APIs
2. barcode + cleaned name via barcode/product APIs or retailer/product sources
3. retailer-scoped barcode query (for example `site:lottemart.vn <barcode>`)
4. cleaned name only

Recommended source preference:
1. barcode/product APIs (for example Open Food Facts, UPCitemdb, Barcode Lookup when available)
2. official brand/manufacturer pages
3. major retailer/product listing pages
4. trusted barcode/product databases
5. other sources only as fallback

Rules:
- Keep source-backed values only.
- If multiple identities conflict, mark as ambiguous and ask user to choose.
- If barcode cannot be confidently verified, keep OCR barcode but lower confidence.
- Skip weighted/internal produce codes early when they are unlikely to map to real retail product pages.
- Always checkpoint partial enrichment output during internet-heavy runs.
- For internet-heavy batches, use sub-agents only when local enrichment is clearly insufficient or the list is too large.

### 3) Map to API payload (`ProductCreate` shape)

Map each finalized item to:

```json
{
  "name": "string",
  "barcode": "string",
  "price": 0,
  "description": "string | null",
  "category": "string | null",
  "stockQuantity": 0,
  "imageUrl": "string | null",
  "imagePublicId": "string | null"
}
```

Mapping for **catalog enrichment mode**:
- `name`: enriched `normalizedName`
- `barcode`: verified barcode if possible, else OCR barcode with lower confidence
- `price`: optional; may use OCR price only if it looks sane, otherwise `0` or existing price strategy depending on API rules
- `stockQuantity`: optional/default; do not block import just because receipt quantity is noisy
- `description`, `category`: enriched if available
- `imageUrl`: enriched product image if available
- `imagePublicId`: `null` unless another upload pipeline fills it later

Mapping for **stock import mode**:
- `name`: normalized OCR/enriched item name
- `barcode`: OCR/enriched/user-confirmed value
- `price`: `unitPrice` as number (`> 0`)
- `stockQuantity`: invoice quantity
- `description`, `category`: enriched if available
- `imageUrl`, `imagePublicId`: `null` for receipt import unless enrichment found a good canonical image

### 4) Upsert via Self Super Market API

Use base URL:
- `SELF_SUPER_MARKET_API_BASE_URL`, or fallback `https://self-super-market.vercel.app`

Per product:

1. Lookup by barcode: `GET /api/products/barcode/{barcode}`
2. If exists:
   - `newStock = existing.stockQuantity + importedQuantity`
   - `PUT /api/products/{id}`
   - include `id` in body
3. If not found:
   - `POST /api/products`

### 5) Confirm before write

Before POST/PUT, show preview grouped into at least:
- catalog-ready confident items
- weighted/fresh produce
- uncertain items

Preview should include:
- `name`
- `barcode`
- `imageUrl` (if found)
- `price`
- `stockQuantity`
- `itemType`
- `category`
- `confidence`
- `sourceUrls`

Ask for explicit confirmation when:
- any item is low confidence,
- any barcode is inferred but weakly verified,
- any weighted item has decimal quantity,
- web sources disagree on identity,
- totals/prices appear inconsistent in stock mode,
- or user did not explicitly request full automatic mode.

For catalog enrichment mode, if the user only wants a product database, it is acceptable to ignore noisy quantity/line-total fields and proceed based on barcode + web-verified product identity.

## API call templates (via exec + curl)

```bash
# 1) Lookup by barcode
curl -sS "${SELF_SUPER_MARKET_API_BASE_URL:-https://self-super-market.vercel.app}/api/products/barcode/${BARCODE}"

# 2) create product
curl -sS -X POST "${SELF_SUPER_MARKET_API_BASE_URL:-https://self-super-market.vercel.app}/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"...",
    "barcode":"...",
    "price":12345,
    "description":"...",
    "category":"...",
    "stockQuantity":10,
    "imageUrl":null,
    "imagePublicId":null
  }'

# 3) Update product (include id in body)
curl -sS -X PUT "${SELF_SUPER_MARKET_API_BASE_URL:-https://self-super-market.vercel.app}/api/products/${ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "id":123,
    "name":"...",
    "barcode":"...",
    "price":12345,
    "description":"...",
    "category":"...",
    "stockQuantity":25
  }'
```

## Failure handling

- OCR fails completely -> ask for clearer image.
- OCR is partially usable on long receipts -> continue with auto-segmentation + preview instead of immediately giving up.
- Enrichment fails -> proceed with known fields; request missing barcode/category.
- API validation fails -> show failing field and ask user to correct.
- If OCR environment is missing dependencies, install/verify at least:
  - `python3-pil` / `Pillow`
  - `python3-opencv`
  - `tesseract-ocr`
  - `tesseract-ocr-vie`
  - `tesseract-ocr-eng`
  - `pytesseract`
  - optionally `rapidfuzz`, `pyzbar`, `pandas`

## Final response format

For stock import mode, return:
- total extracted items
- created count
- updated count
- skipped/failed count
- items needing manual confirmation

For catalog enrichment mode, return:
- total OCR candidates
- unique barcode candidates
- enriched success count
- ambiguous count
- failed lookup count
- skipped internal weighted count
- items ready to import
- items needing manual confirmation

## Automation notes

Preferred automatic command:
- `python3 scripts/run_catalog_flow.py <receipt-image> --out-dir runs/<run-name> --batch-size 8`

Support scripts:
- `scripts/enrich_catalog_candidates.py <receipt_catalog_candidates.json> --out <output.json>`
- `scripts/launch_catalog_flow_background.py <receipt-image> [--run-name <name>]`
- `scripts/watch_catalog_job_notify.py <job_status.json> --target <telegram-chat-id>`
- `scripts/launch_catalog_flow_with_notify.py <receipt-image> --target <telegram-chat-id> [--reply-to <message-id>]`

Behavior requirements:
- do not stop after OCR unless explicitly asked
- write progress lines to stdout so a caller can relay updates
- maintain `job_status.json` so external watchers can notify the user without asking for status manually
- write partial checkpoints during enrichment
- survive partial network failures by keeping completed results
- leave a final `enrichment_results.json` with `summary` + `results`
- prefer running long jobs in background and notify the user from stage changes/checkpoints rather than waiting for them to ask
- for detached execution, use `scripts/launch_catalog_flow_background.py` so the caller gets `jobId`, `statusOutput`, `logOutput`, and `outDir` immediately
- pair background runs with `scripts/watch_catalog_job_notify.py` so stage/progress/completion updates are pushed back automatically
- when sending from a chat workflow, prefer `scripts/launch_catalog_flow_with_notify.py` so the job launcher also starts the watcher with the correct channel/target/reply-to metadata
