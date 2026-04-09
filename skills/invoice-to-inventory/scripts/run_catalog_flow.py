#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from pathlib import Path

from catalog_job_status import append_event, update_status


SCRIPT_DIR = Path(__file__).resolve().parent
OCR_SCRIPT = SCRIPT_DIR / 'receipt_ocr.py'
CANDIDATE_SCRIPT = SCRIPT_DIR / 'receipt_catalog_candidates.py'
ENRICH_SCRIPT = SCRIPT_DIR / 'enrich_catalog_candidates.py'
IMPORT_SCRIPT = SCRIPT_DIR / 'import_inventory.py'


def run_python(script: Path, *args: str) -> str:
    cmd = [sys.executable, str(script), *args]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return result.stdout


def run_python_stream(script: Path, *args: str):
    cmd = [sys.executable, str(script), *args]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    captured = []
    assert proc.stdout is not None
    for line in proc.stdout:
        print(line.rstrip(), flush=True)
        captured.append(line)
    rc = proc.wait()
    if rc != 0:
        raise subprocess.CalledProcessError(rc, cmd, output=''.join(captured))
    return ''.join(captured)


def write_text(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


def chunked(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def main():
    parser = argparse.ArgumentParser(description='Run receipt -> OCR -> candidate -> enrichment flow')
    parser.add_argument('image', help='Path to receipt image')
    parser.add_argument('--out-dir', default=str(SCRIPT_DIR.parent / 'runs' / 'latest'), help='Output directory')
    parser.add_argument('--batch-size', type=int, default=8, help='Suggested batch size for review or sub-agents')
    parser.add_argument('--skip-enrichment', action='store_true', help='Only run OCR + candidate extraction')
    parser.add_argument('--checkpoint-every', type=int, default=8, help='Write enrichment checkpoint every N candidates')
    parser.add_argument('--pause', type=float, default=0.6, help='Pause between web queries in seconds')
    parser.add_argument('--job-id', help='Stable job id for background tracking')
    parser.add_argument('--auto-import', dest='auto_import', action='store_true', default=True, help='Automatically import eligible enriched items into inventory after enrichment (default: enabled)')
    parser.add_argument('--no-auto-import', dest='auto_import', action='store_false', help='Stop after enrichment and do not call the inventory API')
    parser.add_argument('--import-min-confidence', default='medium', choices=['high', 'medium', 'low'], help='Minimum enrichment confidence required for auto-import')
    parser.add_argument('--import-mode', default='catalog', choices=['catalog', 'stock'], help='Inventory import behavior: catalog keeps default stock, stock adds OCR quantity')
    parser.add_argument('--import-default-stock', type=int, default=1, help='Default stockQuantity for catalog import mode')
    parser.add_argument('--import-dry-run', action='store_true', help='Prepare import payloads without calling the inventory API')
    args = parser.parse_args()

    image_path = Path(args.image).resolve()
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    status_path = out_dir / 'job_status.json'
    job_id = args.job_id or out_dir.name
    update_status(
        status_path,
        jobId=job_id,
        state='running',
        stage='initializing',
        image=str(image_path),
        outDir=str(out_dir),
        artifacts={},
        progress={'processed': 0, 'total': 0},
    )
    append_event(status_path, 'job', 'Catalog flow started', {'jobId': job_id})

    print('stage ocr:start', flush=True)
    update_status(status_path, stage='ocr', state='running')
    append_event(status_path, 'stage', 'OCR started')
    ocr_json = run_python(OCR_SCRIPT, str(image_path))
    ocr_path = out_dir / 'receipt_ocr_output.json'
    write_text(ocr_path, ocr_json)
    print('stage ocr:done', flush=True)
    update_status(status_path, stage='ocr', state='running', artifacts={'ocrOutput': str(ocr_path)})
    append_event(status_path, 'stage', 'OCR completed', {'ocrOutput': str(ocr_path)})

    print('stage candidates:start', flush=True)
    update_status(status_path, stage='candidates', state='running', artifacts={'ocrOutput': str(ocr_path)})
    append_event(status_path, 'stage', 'Candidate extraction started')
    candidates_json = run_python(CANDIDATE_SCRIPT, str(ocr_path))
    candidates_path = out_dir / 'receipt_catalog_candidates.json'
    write_text(candidates_path, candidates_json)
    print('stage candidates:done', flush=True)

    candidates = json.loads(candidates_json)
    product_candidates = candidates.get('productCandidates', [])
    update_status(
        status_path,
        stage='candidates',
        state='running',
        progress={'processed': 0, 'total': len(product_candidates)},
        summary=candidates.get('summary', {}),
        artifacts={
            'ocrOutput': str(ocr_path),
            'candidateOutput': str(candidates_path),
        },
    )
    append_event(status_path, 'stage', 'Candidate extraction completed', candidates.get('summary', {}))

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
        'statusOutput': str(status_path),
        'nextStep': 'Run local enrichment with checkpoints unless skipped, then auto-import inventory unless disabled.',
    }
    manifest_path = out_dir / 'catalog_flow_manifest.json'
    write_text(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2))
    update_status(status_path, artifacts={
        'ocrOutput': str(ocr_path),
        'candidateOutput': str(candidates_path),
        'manifestOutput': str(manifest_path),
    })

    if not args.skip_enrichment:
        print('stage enrichment:start', flush=True)
        enrichment_path = out_dir / 'enrichment_results.json'
        update_status(status_path, stage='enrichment', state='running', artifacts={
            'ocrOutput': str(ocr_path),
            'candidateOutput': str(candidates_path),
            'manifestOutput': str(manifest_path),
            'enrichmentOutput': str(enrichment_path),
        })
        append_event(status_path, 'stage', 'Enrichment started')
        run_python_stream(
            ENRICH_SCRIPT,
            str(candidates_path),
            '--out', str(enrichment_path),
            '--status', str(status_path),
            '--checkpoint-every', str(args.checkpoint_every),
            '--pause', str(args.pause),
        )
        print('stage enrichment:done', flush=True)
        manifest['enrichmentOutput'] = str(enrichment_path)
        if enrichment_path.exists():
            enrichment = json.loads(enrichment_path.read_text(encoding='utf-8'))
            manifest['enrichmentSummary'] = enrichment.get('summary', {})
            artifacts = {
                'ocrOutput': str(ocr_path),
                'candidateOutput': str(candidates_path),
                'manifestOutput': str(manifest_path),
                'enrichmentOutput': str(enrichment_path),
            }

            if args.auto_import:
                print('stage import:start', flush=True)
                import_path = out_dir / 'inventory_import_results.json'
                update_status(status_path, stage='import', state='running', artifacts={**artifacts, 'importOutput': str(import_path)})
                append_event(status_path, 'stage', 'Inventory import started', {
                    'importMode': args.import_mode,
                    'minConfidence': args.import_min_confidence,
                    'dryRun': args.import_dry_run,
                })
                run_python_stream(
                    IMPORT_SCRIPT,
                    str(enrichment_path),
                    str(candidates_path),
                    '--out', str(import_path),
                    '--status', str(status_path),
                    '--min-confidence', str(args.import_min_confidence),
                    '--mode', str(args.import_mode),
                    '--default-stock', str(args.import_default_stock),
                    *( ['--dry-run'] if args.import_dry_run else [] ),
                )
                print('stage import:done', flush=True)
                manifest['importOutput'] = str(import_path)
                if import_path.exists():
                    imported = json.loads(import_path.read_text(encoding='utf-8'))
                    manifest['importSummary'] = imported.get('summary', {})
                    artifacts['importOutput'] = str(import_path)

            write_text(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2))
            update_status(
                status_path,
                state='completed',
                stage='completed',
                progress=enrichment.get('progress', {'processed': len(product_candidates), 'total': len(product_candidates)}),
                summary=manifest.get('importSummary') or enrichment.get('summary', {}),
                artifacts=artifacts,
            )
            append_event(status_path, 'job', 'Catalog flow completed', manifest.get('importSummary') or enrichment.get('summary', {}))
    else:
        update_status(status_path, state='completed', stage='completed')
        append_event(status_path, 'job', 'Catalog flow completed without enrichment')

    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
