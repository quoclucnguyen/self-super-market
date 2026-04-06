#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
OCR_SCRIPT = SCRIPT_DIR / 'receipt_ocr.py'
CANDIDATE_SCRIPT = SCRIPT_DIR / 'receipt_catalog_candidates.py'


def run_python(script: Path, *args: str) -> str:
    cmd = [sys.executable, str(script), *args]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return result.stdout


def write_text(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


def chunked(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def main():
    parser = argparse.ArgumentParser(description='Run receipt -> OCR -> catalog-candidate flow')
    parser.add_argument('image', help='Path to receipt image')
    parser.add_argument('--out-dir', default=str(SCRIPT_DIR.parent / 'runs' / 'latest'), help='Output directory')
    parser.add_argument('--batch-size', type=int, default=8, help='Suggested batch size for web enrichment sub-agents')
    args = parser.parse_args()

    image_path = Path(args.image).resolve()
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    ocr_json = run_python(OCR_SCRIPT, str(image_path))
    ocr_path = out_dir / 'receipt_ocr_output.json'
    write_text(ocr_path, ocr_json)

    candidates_json = run_python(CANDIDATE_SCRIPT, str(ocr_path))
    candidates_path = out_dir / 'receipt_catalog_candidates.json'
    write_text(candidates_path, candidates_json)

    candidates = json.loads(candidates_json)
    product_candidates = candidates.get('productCandidates', [])

    batches = []
    for idx, batch in enumerate(chunked(product_candidates, args.batch_size), start=1):
        batch_payload = {
            'batchNumber': idx,
            'batchSize': len(batch),
            'products': batch,
        }
        batch_path = out_dir / f'enrichment_batch_{idx:02d}.json'
        write_text(batch_path, json.dumps(batch_payload, ensure_ascii=False, indent=2))
        batches.append({
            'batchNumber': idx,
            'count': len(batch),
            'path': str(batch_path),
        })

    manifest = {
        'mode': 'catalog_enrichment',
        'image': str(image_path),
        'ocrOutput': str(ocr_path),
        'candidateOutput': str(candidates_path),
        'summary': candidates.get('summary', {}),
        'batchSize': args.batch_size,
        'batches': batches,
        'nextStep': 'Spawn sub-agents using each enrichment_batch_XX.json file for web lookup and metadata normalization.',
    }
    manifest_path = out_dir / 'catalog_flow_manifest.json'
    write_text(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2))

    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
