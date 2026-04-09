#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from catalog_job_status import update_status, append_event

SCRIPT_DIR = Path(__file__).resolve().parent
FLOW_SCRIPT = SCRIPT_DIR / 'run_catalog_flow.py'


def utc_stamp():
    return datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')


def main():
    parser = argparse.ArgumentParser(description='Launch receipt catalog flow as a detached background job')
    parser.add_argument('image', help='Path to receipt image')
    parser.add_argument('--run-name', help='Optional run directory name')
    parser.add_argument('--runs-dir', default=str(SCRIPT_DIR.parent / 'runs'), help='Base runs directory')
    parser.add_argument('--batch-size', type=int, default=8)
    parser.add_argument('--checkpoint-every', type=int, default=8)
    parser.add_argument('--pause', type=float, default=0.6)
    parser.add_argument('--skip-enrichment', action='store_true')
    parser.add_argument('--auto-import', dest='auto_import', action='store_true', default=True)
    parser.add_argument('--no-auto-import', dest='auto_import', action='store_false')
    parser.add_argument('--import-min-confidence', default='medium', choices=['high', 'medium', 'low'])
    parser.add_argument('--import-mode', default='catalog', choices=['catalog', 'stock'])
    parser.add_argument('--import-default-stock', type=int, default=1)
    parser.add_argument('--import-dry-run', action='store_true')
    args = parser.parse_args()

    image_path = Path(args.image).resolve()
    runs_dir = Path(args.runs_dir).resolve()
    run_name = args.run_name or f'bg-{utc_stamp()}'
    out_dir = runs_dir / run_name
    out_dir.mkdir(parents=True, exist_ok=True)

    status_path = out_dir / 'job_status.json'
    log_path = out_dir / 'job.log'
    cmd = [
        sys.executable,
        str(FLOW_SCRIPT),
        str(image_path),
        '--out-dir', str(out_dir),
        '--job-id', run_name,
        '--batch-size', str(args.batch_size),
        '--checkpoint-every', str(args.checkpoint_every),
        '--pause', str(args.pause),
    ]
    if args.skip_enrichment:
        cmd.append('--skip-enrichment')
    if args.auto_import:
        cmd.append('--auto-import')
        cmd.extend(['--import-min-confidence', args.import_min_confidence])
        cmd.extend(['--import-mode', args.import_mode])
        cmd.extend(['--import-default-stock', str(args.import_default_stock)])
    else:
        cmd.append('--no-auto-import')
    if args.import_dry_run:
        cmd.append('--import-dry-run')

    update_status(
        status_path,
        jobId=run_name,
        state='queued',
        stage='queued',
        image=str(image_path),
        outDir=str(out_dir),
        progress={'processed': 0, 'total': 0},
        artifacts={'logOutput': str(log_path)},
    )
    append_event(status_path, 'job', 'Background catalog flow queued', {'command': cmd})

    with open(log_path, 'a', encoding='utf-8') as logf:
        proc = subprocess.Popen(
            cmd,
            stdout=logf,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            cwd=str(SCRIPT_DIR.parent),
            start_new_session=True,
        )

    update_status(
        status_path,
        state='running',
        stage='starting',
        pid=proc.pid,
        artifacts={'logOutput': str(log_path)},
    )
    append_event(status_path, 'job', 'Background catalog flow started', {'pid': proc.pid})

    print(json.dumps({
        'jobId': run_name,
        'pid': proc.pid,
        'outDir': str(out_dir),
        'statusOutput': str(status_path),
        'logOutput': str(log_path),
        'command': cmd,
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
