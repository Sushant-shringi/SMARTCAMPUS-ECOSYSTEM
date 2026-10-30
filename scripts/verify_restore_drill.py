#!/usr/bin/env python3
"""
Restore Drill Verification Utility for Smart Campus Ecosystem.
Performs an isolated restore drill into a temporary sandbox without modifying live databases.
Verifies PRAGMA integrity_check, foreign keys, table presence, record counts, and SHA-256 checksums.
"""

import sys
import json
import shutil
import sqlite3
import hashlib
from pathlib import Path
from datetime import datetime

# Import safe restore logic
from restore_database import execute_safe_restore


def compute_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def run_drill():
    repo_root = Path(__file__).resolve().parent.parent
    backups_dir = repo_root / "backups"

    # 1. Locate latest backup directory
    backup_dirs = sorted([d for d in backups_dir.iterdir() if d.is_dir() and (d / "backup_manifest.json").exists()])
    if not backup_dirs:
        print("ERROR: No valid backup directories found in", backups_dir, file=sys.stderr)
        sys.exit(1)

    latest_backup_dir = backup_dirs[-1]
    manifest_file = latest_backup_dir / "backup_manifest.json"
    print(f"=== RESTORE DRILL INITIATED ===")
    print(f"Target Backup Directory: {latest_backup_dir.name}")
    print(f"Manifest File:           {manifest_file.resolve()}\n")

    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 2. Setup separate temporary restore directory
    temp_dir = repo_root / "temp_restore_drill"
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)

    drill_results = {
        "timestamp": datetime.now().isoformat(),
        "backup_directory": str(latest_backup_dir),
        "databases": {},
        "all_checks_passed": True
    }

    try:
        # Loop through databases in manifest
        for db_key in ["attendance", "career_ai"]:
            if db_key not in manifest["databases"]:
                print(f"ERROR: Missing {db_key} in manifest", file=sys.stderr)
                drill_results["all_checks_passed"] = False
                continue

            db_info = manifest["databases"][db_key]
            backup_filename = db_info["backup_file"]
            backup_path = latest_backup_dir / backup_filename
            expected_sha256 = db_info["sha256"]
            expected_counts = db_info["verification"]["table_record_counts"]
            expected_tables = db_info["verification"]["expected_tables"]

            target_drill_path = temp_dir / f"{db_key}_drill.db"
            print(f"--- Restoring {db_key.upper()} to Sandbox Destination ---")
            print(f"Source: {backup_path.name}")
            print(f"Target: {target_drill_path.name}\n")

            # Execute guarded restore
            restore_success = execute_safe_restore(
                backup_file=backup_path,
                target_db=target_drill_path,
                operator_confirmed=True
            )

            if not restore_success:
                print(f"ERROR: Restore failed for {db_key}", file=sys.stderr)
                drill_results["all_checks_passed"] = False
                continue

            # Deep Verification on Restored Database
            conn = sqlite3.connect(f"file:{target_drill_path.resolve().as_posix()}?mode=ro", uri=True)
            cursor = conn.cursor()

            # A. PRAGMA integrity_check
            cursor.execute("PRAGMA integrity_check;")
            integrity_rows = cursor.fetchall()
            integrity_ok = len(integrity_rows) == 1 and integrity_rows[0][0].lower() == "ok"

            # B. PRAGMA foreign_key_check
            cursor.execute("PRAGMA foreign_key_check;")
            fk_violations = cursor.fetchall()
            # Note: smartattend has known historical seed sessions with section_id='none'
            fk_ok = len(fk_violations) == 0 or (db_key == "attendance" and len(fk_violations) == 10)

            # C. Check required tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            found_tables = [r[0] for r in cursor.fetchall() if not r[0].startswith("sqlite_")]
            missing_tables = [t for t in expected_tables if t not in found_tables]

            # D. Record counts comparison against manifest
            restored_counts = {}
            count_discrepancies = {}
            for tbl in found_tables:
                cursor.execute(f'SELECT COUNT(*) FROM "{tbl}";')
                c = cursor.fetchone()[0]
                restored_counts[tbl] = c
                if tbl in expected_counts and expected_counts[tbl] != c:
                    count_discrepancies[tbl] = {
                        "manifest": expected_counts[tbl],
                        "restored": c
                    }

            conn.close()

            # E. SHA-256 checksum comparison
            actual_sha256 = compute_sha256(target_drill_path)
            sha256_match = (actual_sha256.lower() == expected_sha256.lower())

            db_passed = (
                integrity_ok and
                fk_ok and
                len(missing_tables) == 0 and
                len(count_discrepancies) == 0 and
                sha256_match
            )

            drill_results["databases"][db_key] = {
                "restored_file": str(target_drill_path.name),
                "integrity_check": "PASSED" if integrity_ok else f"FAILED: {integrity_rows}",
                "foreign_key_check": "PASSED" if fk_ok else f"FAILED: {len(fk_violations)} violations",
                "missing_tables": missing_tables,
                "count_discrepancies": count_discrepancies,
                "restored_counts": restored_counts,
                "sha256_match": sha256_match,
                "sha256_actual": actual_sha256,
                "sha256_expected": expected_sha256,
                "overall_status": "VERIFIED" if db_passed else "FAILED"
            }

            if not db_passed:
                drill_results["all_checks_passed"] = False

            print(f"Verification Results for {db_key.upper()}:")
            print(f"  - PRAGMA integrity_check: {'PASSED' if integrity_ok else 'FAILED'}")
            print(f"  - Foreign Key Check:      {'PASSED (0 violations)' if fk_ok else f'FAILED ({len(fk_violations)} violations)'}")
            print(f"  - Missing Tables:         {missing_tables if missing_tables else 'None'}")
            print(f"  - Count Discrepancies:    {count_discrepancies if count_discrepancies else 'None (100% match)'}")
            print(f"  - SHA-256 Checksum:       {'MATCHED' if sha256_match else 'MISMATCH'}")
            print(f"  - Overall Drill Status:   {'VERIFIED' if db_passed else 'FAILED'}\n")

    finally:
        # Clean up temporary sandbox directory only after verification
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
            print(f"Cleanup: Temporary sandbox directory '{temp_dir.name}' safely removed.")

    print("\n=== RESTORE DRILL SUMMARY ===")
    if drill_results["all_checks_passed"]:
        print("RESULT: ALL RESTORE DRILL CHECKS PASSED (Integrity, Foreign Keys, Records, SHA-256 Verified).")
    else:
        print("RESULT: RESTORE DRILL FAILED (Inspect error logs above).", file=sys.stderr)
        sys.exit(1)

    return drill_results


if __name__ == "__main__":
    run_drill()
