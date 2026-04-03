---
name: invoice_to_inventory
description: Extract products from Telegram invoice images with OpenClaw vision, enrich missing fields from the web, then create/update inventory via Self Super Market API.
metadata:
  openclaw:
    requires:
      bins: ["curl", "python3"]
---

# Invoice to Inventory (Telegram -> Self Super Market)

Use this skill when the user sends an **invoice/receipt image** (especially from Telegram) and asks to import products into inventory.

## Goal

Turn a receipt image into valid product records for:
- `POST /api/products`
- `PUT /api/products/{id}`

using the API spec in `openapi-spec.json` and field model aligned with `drizzle/schema.ts` (`products` table).

## Required output quality

1. Prefer correctness over speed.
2. Always produce structured data per line item.
3. If confidence is low (OCR/barcode), ask the user to confirm before writing.

## Input expectations

- At least one image attachment from user message.
- Optional hints: merchant name, language, currency, country.

If no image is attached, ask the user to upload a clear invoice image.

## Workflow

### 1) OCR + structured extraction (use OpenClaw AI vision model)

Extract:
- `merchantName`
- `invoiceDate`
- `currency`
- `items[]` with:
  - `rawName`
  - `quantity`
  - `unitPrice`
  - `lineTotal`
  - `ocrConfidence` (`high|medium|low`)

Normalization rules:
- `quantity` must be integer >= 1 (default 1 if unclear).
- `unitPrice` fallback: `lineTotal / quantity`.
- Trim noisy suffixes/prefixes from product names (promo text, separators, duplicated spaces).

### 2) Enrich missing product info from the web

For each item, search the web to infer:
- `barcode` (highest priority)
- `category`
- `description`

Enrichment policy:
- Keep source-backed values only.
- If multiple conflicting barcodes are found, mark as ambiguous and ask user confirmation.
- If barcode cannot be found confidently, ask user for barcode or allow temporary barcode fallback.

### 3) Map to API payload (`ProductCreate`)

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

Mapping rules:
- `name`: normalized product name.
- `barcode`: from OCR/enrichment/user confirmation.
- `price`: use `unitPrice` as number (> 0).
- `stockQuantity`: invoice quantity.
- `description`, `category`: enriched if available.
- `imageUrl`, `imagePublicId`: normally `null` for receipt import.

### 4) Upsert strategy against Self Super Market API

Use base URL:
- `SELF_SUPER_MARKET_API_BASE_URL` if available
- otherwise `http://localhost:3000`

Per product:

1. Check existing by barcode:
   - `GET /api/products/barcode/{barcode}`
2. If exists:
   - compute `newStock = existing.stockQuantity + importedQuantity`
   - call `PUT /api/products/{id}`
   - include `id` in body (current backend validation expects it)
3. If not found:
   - call `POST /api/products`

### 5) Confirm-before-write policy

Before POST/PUT, show a concise preview table:
- `name`
- `barcode`
- `price`
- `stockQuantity`
- `category`
- `confidence`

Ask for explicit confirmation when:
- any item has low confidence,
- any barcode is inferred but not strongly verified,
- or user did not request fully automatic mode.

## API call templates (via exec + curl)

```bash
# 1) find existing product by barcode
curl -sS "${SELF_SUPER_MARKET_API_BASE_URL:-http://localhost:3000}/api/products/barcode/${BARCODE}"

# 2) create product
curl -sS -X POST "${SELF_SUPER_MARKET_API_BASE_URL:-http://localhost:3000}/api/products" \
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

# 3) update product (note: include id in body)
curl -sS -X PUT "${SELF_SUPER_MARKET_API_BASE_URL:-http://localhost:3000}/api/products/${ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123,
    "name":"...",
    "barcode":"...",
    "price":12345,
    "description":"...",
    "category":"...",
    "stockQuantity":25
  }'
```

## Failure handling

- If OCR fails: request a clearer image.
- If enrichment fails: proceed with known fields and ask user to fill missing barcode/category.
- If API returns validation error: show failing payload field and ask user for correction.

## Final response format

Return a short summary including:
- total extracted items
- created count
- updated count
- skipped/failed count
- list of items needing manual confirmation
