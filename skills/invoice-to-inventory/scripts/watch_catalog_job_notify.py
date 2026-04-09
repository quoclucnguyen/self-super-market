#!/usr/bin/env python3
import argparse
import json
import subprocess
import time
from pathlib import Path


def load_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding='utf-8'))


def send_message(cmd):
    subprocess.run(
        cmd,
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def make_send_command(channel: str, target: str, text: str, reply_to: str | None = None):
    cmd = [
        'openclaw', 'message', 'send',
        '--channel', channel,
        '--target', target,
        '--message', text,
    ]
    if reply_to:
        cmd.extend(['--reply-to', reply_to])
    return cmd


def progress_key(status: dict):
    stage = status.get('stage')
    state = status.get('state')
    progress = status.get('progress') or {}
    processed = progress.get('processed')
    total = progress.get('total')
    events = status.get('events') or []
    last_event = events[-1]['message'] if events else ''
    return (stage, state, processed, total, last_event)


def format_update(job_id: str, status: dict):
    stage = status.get('stage', 'unknown')
    state = status.get('state', 'unknown')
    progress = status.get('progress') or {}
    summary = status.get('summary') or {}
    processed = progress.get('processed')
    total = progress.get('total')
    extra = ''
    if processed is not None and total is not None and total:
        extra = f' ({processed}/{total})'
    if state == 'completed':
        parts = [f'Job `{job_id}` xong.']
        if summary:
            parts.append('Summary: ' + ', '.join(f'{k}={v}' for k, v in summary.items()))
        return ' '.join(parts)
    if state == 'failed':
        return f'Job `{job_id}` lỗi ở stage `{stage}`{extra}.'
    return f'Job `{job_id}` đang ở stage `{stage}` / state `{state}`{extra}.'


def main():
    parser = argparse.ArgumentParser(description='Watch catalog flow job_status.json and send Telegram updates')
    parser.add_argument('status_json', help='Path to job_status.json')
    parser.add_argument('--target', required=True, help='Target chat id / username')
    parser.add_argument('--channel', default='telegram', help='Messaging channel (default: telegram)')
    parser.add_argument('--reply-to', help='Optional original message id to reply to')
    parser.add_argument('--poll-interval', type=float, default=5.0)
    parser.add_argument('--max-idle-seconds', type=float, default=3600.0)
    parser.add_argument('--job-id', help='Optional job id override')
    args = parser.parse_args()

    status_path = Path(args.status_json).resolve()
    last_key = None
    idle_started = time.time()
    sent_start = False

    while True:
        status = load_json(status_path)
        if status is None:
            time.sleep(args.poll_interval)
            if time.time() - idle_started > args.max_idle_seconds:
                break
            continue

        job_id = args.job_id or status.get('jobId') or status_path.parent.name
        key = progress_key(status)
        if not sent_start:
            send_message(
                make_send_command(
                    args.channel,
                    args.target,
                    f'Job `{job_id}` đã chạy nền. Mình sẽ tự báo tiến độ.',
                    args.reply_to,
                )
            )
            sent_start = True
        if key != last_key:
            send_message(
                make_send_command(
                    args.channel,
                    args.target,
                    format_update(job_id, status),
                    args.reply_to,
                )
            )
            last_key = key
            idle_started = time.time()

        if status.get('state') in {'completed', 'failed'}:
            break

        if time.time() - idle_started > args.max_idle_seconds:
            send_message(
                make_send_command(
                    args.channel,
                    args.target,
                    f'Job `{job_id}` watcher dừng vì quá lâu không có cập nhật mới.',
                    args.reply_to,
                )
            )
            break
        time.sleep(args.poll_interval)


if __name__ == '__main__':
    main()
