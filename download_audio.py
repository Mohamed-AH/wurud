#!/usr/bin/env python3
"""
Download audio files using a CSV list of Short IDs.

Usage:
    python download_audio.py input.csv [--output-dir ./downloads] [--column short_id]

CSV format expected:
    short_id
    abc123
    def456
    ...
"""

import argparse
import csv
import os
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests

# Configure your base URL here
BASE_URL = "https://your-storage-url.com/audio/"
AUDIO_EXTENSION = ".mp3"


def download_file(url: str, output_path: Path, timeout: int = 30) -> bool:
    """Download a file from URL to the specified path."""
    try:
        response = requests.get(url, timeout=timeout, stream=True)
        response.raise_for_status()

        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except requests.RequestException as e:
        print(f"  Error downloading {url}: {e}")
        return False


def read_short_ids(csv_path: str, column: str = "short_id") -> list[str]:
    """Read Short IDs from a CSV file."""
    short_ids = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        if column not in reader.fieldnames:
            # Try first column if specified column not found
            reader = csv.DictReader(f)
            f.seek(0)
            next(f)  # Skip header
            for row in csv.reader(f):
                if row:
                    short_ids.append(row[0].strip())
        else:
            for row in reader:
                if row.get(column):
                    short_ids.append(row[column].strip())

    return short_ids


def download_audio_files(
    short_ids: list[str],
    output_dir: Path,
    base_url: str = BASE_URL,
    delay: float = 0.5
) -> dict:
    """Download audio files for all Short IDs."""
    output_dir.mkdir(parents=True, exist_ok=True)

    results = {"success": [], "failed": []}
    total = len(short_ids)

    for i, short_id in enumerate(short_ids, 1):
        audio_url = urljoin(base_url, f"{short_id}{AUDIO_EXTENSION}")
        output_path = output_dir / f"{short_id}{AUDIO_EXTENSION}"

        print(f"[{i}/{total}] Downloading {short_id}...", end=" ")

        if output_path.exists():
            print("SKIPPED (exists)")
            results["success"].append(short_id)
            continue

        if download_file(audio_url, output_path):
            print("OK")
            results["success"].append(short_id)
        else:
            print("FAILED")
            results["failed"].append(short_id)

        if delay and i < total:
            time.sleep(delay)

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Download audio files using a CSV list of Short IDs"
    )
    parser.add_argument("csv_file", help="Path to CSV file containing Short IDs")
    parser.add_argument(
        "--output-dir", "-o",
        default="./downloads",
        help="Output directory for downloaded files (default: ./downloads)"
    )
    parser.add_argument(
        "--column", "-c",
        default="short_id",
        help="CSV column name containing Short IDs (default: short_id)"
    )
    parser.add_argument(
        "--base-url", "-u",
        default=BASE_URL,
        help="Base URL for audio files"
    )
    parser.add_argument(
        "--delay", "-d",
        type=float,
        default=0.5,
        help="Delay between downloads in seconds (default: 0.5)"
    )

    args = parser.parse_args()

    if not os.path.exists(args.csv_file):
        print(f"Error: CSV file not found: {args.csv_file}")
        sys.exit(1)

    print(f"Reading Short IDs from {args.csv_file}...")
    short_ids = read_short_ids(args.csv_file, args.column)

    if not short_ids:
        print("No Short IDs found in CSV file.")
        sys.exit(1)

    print(f"Found {len(short_ids)} Short IDs")
    print(f"Downloading to: {args.output_dir}")
    print(f"Base URL: {args.base_url}")
    print("-" * 50)

    results = download_audio_files(
        short_ids,
        Path(args.output_dir),
        args.base_url,
        args.delay
    )

    print("-" * 50)
    print(f"Complete: {len(results['success'])} success, {len(results['failed'])} failed")

    if results["failed"]:
        print("\nFailed IDs:")
        for short_id in results["failed"]:
            print(f"  - {short_id}")


if __name__ == "__main__":
    main()
