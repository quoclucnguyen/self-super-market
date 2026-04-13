#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
LAUNCH_SCRIPT = SCRIPT_DIR / 'launch_catalog_flow_background.py'
WATCH_SCRIPT = SCRIPT_DIR / 'watch_catalog_job_notify.py'


def main():
    parser = argparse.ArgumentParser(description='Launch catalog flow in background and auto-notify a chat')
    parser.add_argument('image', help='Path to receipt image')
    parser.add_argument('--target', required=True, help='Target chat id / username')
    parser.add_argument('--channel', default='telegram', help='Messaging channel (default: telegram)')
    parser.add_argument('--reply-to', help='Optional original message id to reply to')
    parser.add_argument('--run-name', help='Optional run directory name')
    parser.add_argument('--runs-dir', default=str(SCRIPT_DIR.parent / 'runs'), help='Base runs directory')
    parser.add_argument('--batch-size', type=int, default=8)
    parser.add_argument('--checkpoint-every', type=int, default=8)
    parser.add_argument('--pause', type=float, default=0.6)
    parser.add_argument('--poll-interval', type=float, default=5.0)
    parser.add_argument('--max-idle-seconds', type=float, default=3600.0)
    parser.add_argument('--skip-enrichment', action='store_true')
    parser.add_argument('--auto-import', dest='auto_import', action='store_true', default=True)
    parser.add_argument('--no-auto-import', dest='auto_import', action='store_false')
    parser.add_argument('--import-min-confidence', default='medium', choices=['high', 'medium', 'low'])
    parser.add_argument('--import-mode', default='catalog', choices=['catalog', 'stock'])
    parser.add_argument('--import-default-stock', type=int, default=1)
    parser.add_argument('--import-dry-run', action='store_true')
    args = parser.parse_args()

    launch_cmd = [
        sys.executable,
        str(LAUNCH_SCRIPT),
        args.image,
        '--runs-dir', args.runs_dir,
        '--batch-size', str(args.batch_size),
        '--checkpoint-every', str(args.checkpoint_every),
        '--pause', str(args.pause),
    ]
    if args.run_name:
        launch_cmd.extend(['--run-name', args.run_name])
    if args.skip_enrichment:
        launch_cmd.append('--skip-enrichment')
    if args.auto_import:
        launch_cmd.append('--auto-import')
        launch_cmd.extend(['--import-min-confidence', args.import_min_confidence])
        launch_cmd.extend(['--import-mode', args.import_mode])
        launch_cmd.extend(['--import-default-stock', str(args.import_default_stock)])
    else:
        launch_cmd.append('--no-auto-import')
    if args.import_dry_run:
        launch_cmd.append('--import-dry-run')

    launch_result = subprocess.run(launch_cmd, check=True, capture_output=True, text=True)
    payload = json.loads(launch_result.stdout)

    watch_cmd = [
        sys.executable,
        str(WATCH_SCRIPT),
        payload['statusOutput'],
        '--channel', args.channel,
        '--target', args.target,
        '--poll-interval', str(args.poll_interval),
        '--max-idle-seconds', str(args.max_idle_seconds),
        '--job-id', payload['jobId'],
    ]
    if args.reply_to:
        watch_cmd.extend(['--reply-to', args.reply_to])

    watcher_log = Path(payload['outDir']) / 'watcher.log'
    with open(watcher_log, 'a', encoding='utf-8') as logf:
        logf.write('watch_cmd=' + json.dumps(watch_cmd, ensure_ascii=False) + '\n')
        logf.flush()
        watcher = subprocess.Popen(
            watch_cmd,
            stdout=logf,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            cwd=str(SCRIPT_DIR.parent),
            start_new_session=True,
        )

    payload['watcherPid'] = watcher.pid
    payload['watcherLog'] = str(watcher_log)
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
