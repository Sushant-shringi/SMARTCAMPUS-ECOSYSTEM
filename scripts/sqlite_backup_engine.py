#!/usr/bin/env python3
"""
SQLite Online Backup Engine for Smart Campus Ecosystem.
Implements non-destructive online backups using SQLite's online backup API.
Compatible with WAL mode databases, containerized volumes, and local development.
"""

import os
import sys
import json
import sqlite3
import hashlib
import argparse
from pathlib import Path
from datetime import datetime, timezone

# Expected core tables for verification
EXPECTED_ATTENDANCE_TABLES = [
    "users",
    "students",
    "attendance_sessions",
    "attendance_records"
]

EXPECTED_CAREER_TABLES = [
    "resumes",
    "placement_drives",
    "placement_applications",
    "application_audits"
]


def compute_sha256(filepath: Path) -> str:
    """Compute SHA-256 checksum of a file without loading it all into memory."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def perform_online_backup(source_path: Path, dest_path: Path) -> dict:
    """
    Perform a live, non-destructive backup using SQLite's online backup API.
    Handles WAL mode databases by locking pages during read and producing
    a standalone, consolidated target database.
    """
    if not source_path.exists():
        raise FileNotFoundError(f"Source database does not exist: {source_path}")

    dest_path.parent.mkdir(parents=True, exist_ok=True)

    # Use read-only URI mode to guarantee source is never modified
    src_uri = f"file:{source_path.resolve().as_posix()}?mode=ro"
    source_conn = sqlite3.connect(src_uri, uri=True)
    dest_conn = sqlite3.connect(dest_path.resolve().as_posix())

    try:
        # sqlite3.backup copies active WAL state cleanly into the target
        with dest_conn:
            source_conn.backup(dest_conn, pages=100, progress=None)
    finally:
        dest_conn.close()
        source_conn.close()

    dest_size = dest_path.stat().st_size
    dest_sha256 = compute_sha256(dest_path)

    return {
        "dest_path": str(dest_path.resolve()),
        "size_bytes": dest_size,
        "sha256": dest_sha256,
    }


def verify_backup(backup_path: Path, expected_tables: list) -> dict:
    """
    Run PRAGMA integrity_check and verify that expected tables exist
    and report record counts without exposing any sensitive content.
    """
    conn = sqlite3.connect(f"file:{backup_path.resolve().as_posix()}?mode=ro", uri=True)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA integrity_check;")
        integrity_rows = cursor.fetchall()
        integrity_passed = len(integrity_rows) == 1 and str(integrity_rows[0][0]).lower() == "ok"

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables_found = [row[0] for row in cursor.fetchall()]

        missing_tables = [t for t in expected_tables if t not in tables_found]

        table_counts = {}
        for tbl in tables_found:
            if not tbl.startswith("sqlite_"):
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM "{tbl}";')
                    table_counts[tbl] = cursor.fetchone()[0]
                except Exception as e:
                    table_counts[tbl] = f"error: {str(e)}"

        return {
            "integrity_passed": integrity_passed,
            "integrity_status": "ok" if integrity_passed else "corrupt",
            "integrity_output": [r[0] for r in integrity_rows],
            "expected_tables": expected_tables,
            "missing_tables": missing_tables,
            "verified_tables_count": len(tables_found),
            "table_record_counts": table_counts
        }
    finally:
        conn.close()


def run_backup_job(
    attendance_db: Path,
    career_db: Path,
    output_dir: Path,
    mode: str = "local"
) -> dict:
    """Execute complete backup cycle for both databases and produce signed manifest."""
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    local_timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    job_output_dir = output_dir / timestamp_str
    job_output_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "version": "1.0",
        "backup_id": f"backup_{timestamp_str}",
        "timestamp_utc": timestamp_str,
        "timestamp_local": local_timestamp_str,
        "deployment_mode": mode,
        "databases": {},
        "all_passed": False
    }

    print(f"[{local_timestamp_str}] Starting SQLite Online Backup (Mode: {mode})...")
    print(f"Output directory: {job_output_dir.resolve()}")

    overall_success = True

    # 1. Attendance Service Database Backup
    if attendance_db and attendance_db.exists():
        att_dest = job_output_dir / f"smartattend_{timestamp_str}.db"
        print(f"\n-> Backing up Attendance DB: {attendance_db}")
        att_meta = perform_online_backup(attendance_db, att_dest)
        att_verif = verify_backup(att_dest, EXPECTED_ATTENDANCE_TABLES)

        if not att_verif["integrity_passed"] or len(att_verif["missing_tables"]) > 0:
            overall_success = False

        manifest["databases"]["attendance"] = {
            "source": str(attendance_db.resolve()),
            "backup_file": att_dest.name,
            "size_bytes": att_meta["size_bytes"],
            "sha256": att_meta["sha256"],
            "verification": att_verif
        }
        print(f"   Backup file: {att_dest.name} ({att_meta['size_bytes']} bytes)")
        print(f"   Integrity: {att_verif['integrity_status'].upper()}")
        print(f"   Tables verified: {att_verif['verified_tables_count']} (Missing: {len(att_verif['missing_tables'])})")
        print(f"   Record summary: {att_verif['table_record_counts']}")
    else:
        print(f"Attendance DB not found at: {attendance_db}")
        manifest["databases"]["attendance"] = {"error": f"Source not found: {attendance_db}"}
        overall_success = False

    # 2. Career Assistant Database Backup
    if career_db and career_db.exists():
        career_dest = job_output_dir / f"career_assistant_{timestamp_str}.db"
        print(f"\n-> Backing up Career AI DB: {career_db}")
        car_meta = perform_online_backup(career_db, career_dest)
        car_verif = verify_backup(career_dest, EXPECTED_CAREER_TABLES)

        if not car_verif["integrity_passed"] or len(car_verif["missing_tables"]) > 0:
            overall_success = False

        manifest["databases"]["career_ai"] = {
            "source": str(career_db.resolve()),
            "backup_file": career_dest.name,
            "size_bytes": car_meta["size_bytes"],
            "sha256": car_meta["sha256"],
            "verification": car_verif
        }
        print(f"   Backup file: {career_dest.name} ({car_meta['size_bytes']} bytes)")
        print(f"   Integrity: {car_verif['integrity_status'].upper()}")
        print(f"   Tables verified: {car_verif['verified_tables_count']} (Missing: {len(car_verif['missing_tables'])})")
        print(f"   Record summary: {car_verif['table_record_counts']}")
    else:
        print(f"Career AI DB not found at: {career_db}")
        manifest["databases"]["career_ai"] = {"error": f"Source not found: {career_db}"}
        overall_success = False

    manifest["all_passed"] = overall_success

    # Write Manifest
    manifest_path = job_output_dir / "backup_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # Also update/append latest manifest pointer in root of backups/
    latest_pointer = output_dir / "latest_manifest.json"
    with open(latest_pointer, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"\nBackup manifest created: {manifest_path.resolve()}")
    if overall_success:
        print("ONLINE BACKUP STATUS: SUCCESS (All integrity checks and table validations passed)")
    else:
        print("ONLINE BACKUP STATUS: FAILED (Errors detected, inspect manifest)")

    return manifest


def apply_backup_retention(
    output_dir: Path,
    retain_count: int = 7,
    dry_run: bool = True
) -> dict:
    """
    Enforce backup retention policy:
    1. Retain configurable number of recent valid backups (default: 7).
    2. Never delete the only available valid backup.
    3. Never delete backups actively used by a restore operation (staging lock present).
    4. Support dry-run mode (default).
    5. Report every backup selected for deletion before actual deletion.
    """
    import shutil

    print("\n--- BACKUP RETENTION AUDIT ---")
    print(f"Policy: Retain latest {retain_count} backups. Mode: {'DRY-RUN' if dry_run else 'ACTIVE PRUNING'}")

    if not output_dir.exists():
        print(f"Directory {output_dir} does not exist.")
        return {"retained": [], "deleted": [], "candidates": []}

    # Identify valid backup directories containing a valid backup_manifest.json
    all_subdirs = [d for d in output_dir.iterdir() if d.is_dir() and (d / "backup_manifest.json").exists()]

    valid_backups = []
    for d in all_subdirs:
        try:
            with open(d / "backup_manifest.json", "r", encoding="utf-8") as f:
                data = json.load(f)
            if data.get("all_passed", False) or "databases" in data:
                valid_backups.append(d)
        except Exception:
            pass

    # Sort chronologically by directory name (oldest first)
    valid_backups.sort(key=lambda p: p.name)
    total_valid = len(valid_backups)
    print(f"Found {total_valid} valid backup directory(ies).")

    if total_valid <= 1:
        print("RULE ENFORCED: Never delete the only available valid backup. Retention audit complete (0 removed).")
        return {"retained": [str(d.name) for d in valid_backups], "deleted": [], "candidates": []}

    if total_valid <= retain_count:
        print(f"Total backups ({total_valid}) <= retention limit ({retain_count}). All valid backups retained.")
        return {"retained": [str(d.name) for d in valid_backups], "deleted": [], "candidates": []}

    # Excess backups selected for deletion
    excess_count = total_valid - retain_count
    candidates = valid_backups[:excess_count]
    retained = valid_backups[excess_count:]

    deleted_records = []
    print(f"Selecting {len(candidates)} excess backup(s) for deletion (retaining latest {len(retained)}):")

    for c in candidates:
        # Check if directory has active lock or staging marker
        lock_markers = list(c.glob("*.lock")) + list(c.glob("*staging*"))
        if lock_markers:
            print(f"  [PROTECTED] {c.name} is currently flagged as active/locked ({lock_markers}). Retaining.")
            retained.append(c)
            continue

        total_size = sum(f.stat().st_size for f in c.glob("**/*") if f.is_file())
        print(f"  -> Candidate selected for deletion: {c.name} ({total_size} bytes)")

        if dry_run:
            print(f"     [DRY-RUN] Retention would remove: {c.resolve()}")
            deleted_records.append({"path": str(c.name), "size_bytes": total_size, "action": "dry_run_delete"})
        else:
            print(f"     [ACTION - DELETING]: {c.resolve()}")
            shutil.rmtree(c)
            deleted_records.append({"path": str(c.name), "size_bytes": total_size, "action": "deleted"})

    print(f"Retention audit complete. Retained: {len(retained)}, Selected for removal: {len(deleted_records)}\n")
    return {
        "retained": [str(d.name) for d in retained],
        "candidates": [str(d.name) for d in candidates],
        "deleted": deleted_records,
        "dry_run": dry_run
    }


def main():
    parser = argparse.ArgumentParser(description="Smart Campus SQLite Online Backup Tool")
    parser.add_argument("--attendance-db", type=Path, default=None, help="Path to attendance SQLite database")
    parser.add_argument("--career-db", type=Path, default=None, help="Path to Career AI SQLite database")
    parser.add_argument("--output-dir", type=Path, default=Path("backups"), help="Directory to store backups")
    parser.add_argument("--mode", type=str, default="local", choices=["local", "docker"], help="Deployment mode")
    parser.add_argument("--retain-count", type=int, default=7, help="Number of backups to retain (default: 7)")
    parser.add_argument("--apply-retention", action="store_true", help="Apply retention policy after backup")
    parser.add_argument("--execute-prune", action="store_true", help="Execute actual deletion (default is dry-run)")

    args = parser.parse_args()

    # Determine default paths based on repository root
    repo_root = Path(__file__).resolve().parent.parent

    attendance_path = args.attendance_db
    if attendance_path is None:
        attendance_path = repo_root / "services" / "attendance-service" / "smartattend.db"

    career_path = args.career_db
    if career_path is None:
        candidate1 = repo_root / "services" / "career-ai-service" / "data" / "career_assistant.db"
        candidate2 = repo_root / "services" / "career-ai-service" / "career_assistant.db"
        career_path = candidate1 if candidate1.exists() and candidate1.stat().st_size > 0 else candidate2

    output_dir = args.output_dir
    if not output_dir.is_absolute():
        output_dir = repo_root / output_dir

    result = run_backup_job(
        attendance_db=attendance_path,
        career_db=career_path,
        output_dir=output_dir,
        mode=args.mode
    )

    if not result["all_passed"]:
        sys.exit(1)

    if args.apply_retention:
        apply_backup_retention(
            output_dir=output_dir,
            retain_count=args.retain_count,
            dry_run=not args.execute_prune
        )


if __name__ == "__main__":
    main()
