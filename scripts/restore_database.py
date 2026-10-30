#!/usr/bin/env python3
"""
SQLite Safe Database Restore Utility for Smart Campus Ecosystem.
Implements multi-step verification, safety staging, mandatory pre-restore snapshot,
WAL checkpoint safety, and operator confirmation gates.
"""

import os
import sys
import shutil
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime, timezone


def verify_sqlite_integrity(db_path: Path) -> tuple[bool, str]:
    """Verify that an SQLite database file passes PRAGMA integrity_check."""
    if not db_path.exists():
        return False, f"File does not exist: {db_path}"

    try:
        conn = sqlite3.connect(f"file:{db_path.resolve().as_posix()}?mode=ro", uri=True)
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        rows = cursor.fetchall()
        conn.close()

        if len(rows) == 1 and str(rows[0][0]).lower() == "ok":
            return True, "Integrity OK"
        return False, f"Integrity check failed: {rows}"
    except Exception as e:
        return False, f"Error inspecting database: {e}"


def get_table_counts(db_path: Path) -> dict:
    """Return dictionary of non-sqlite table names and record counts."""
    conn = sqlite3.connect(f"file:{db_path.resolve().as_posix()}?mode=ro", uri=True)
    cursor = conn.cursor()
    counts = {}
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [r[0] for r in cursor.fetchall() if not r[0].startswith("sqlite_")]
        for t in tables:
            try:
                cursor.execute(f'SELECT COUNT(*) FROM "{t}";')
                counts[t] = cursor.fetchone()[0]
            except Exception as e:
                counts[t] = f"err: {e}"
    finally:
        conn.close()
    return counts


def execute_safe_restore(
    backup_file: Path,
    target_db: Path,
    operator_confirmed: bool = False
) -> bool:
    """Safely restore a backup into target_db following the 7-step safety runbook."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    print("=" * 60)
    print(" SMART CAMPUS ECOSYSTEM - SAFE DATABASE RESTORE")
    print(f" Timestamp (UTC): {timestamp}")
    print("=" * 60)

    # Step 1: Pre-restore verification of the backup artifact
    print(f"\n[Step 1/6] Verifying integrity of backup file: {backup_file}")
    backup_ok, backup_msg = verify_sqlite_integrity(backup_file)
    if not backup_ok:
        print(f"ERROR: Backup artifact is invalid or corrupt: {backup_msg}", file=sys.stderr)
        return False
    backup_counts = get_table_counts(backup_file)
    print(f"   Backup verification PASSED ({backup_file.stat().st_size} bytes)")
    print(f"   Tables found in backup: {list(backup_counts.keys())}")
    print(f"   Record summary: {backup_counts}")

    # Step 2: Separate staging destination
    staging_file = target_db.parent / f"{target_db.stem}.restore_staging_{timestamp}.db"
    print(f"\n[Step 2/6] Staging restore to temporary destination: {staging_file}")
    shutil.copy2(backup_file, staging_file)
    stage_ok, stage_msg = verify_sqlite_integrity(staging_file)
    if not stage_ok:
        print(f"ERROR: Staged database failed integrity verification: {stage_msg}", file=sys.stderr)
        if staging_file.exists():
            staging_file.unlink()
        return False
    print("   Staging integrity check PASSED.")

    # Step 3: Snapshot existing target database (if it exists)
    if target_db.exists():
        pre_restore_bak = target_db.parent / f"{target_db.name}.pre_restore_{timestamp}.bak"
        print(f"\n[Step 3/6] Creating snapshot of active database: {pre_restore_bak}")
        shutil.copy2(target_db, pre_restore_bak)

        # Snapshot active WAL files if present
        target_wal = target_db.parent / f"{target_db.name}-wal"
        target_shm = target_db.parent / f"{target_db.name}-shm"
        if target_wal.exists():
            shutil.copy2(target_wal, target_db.parent / f"{target_db.name}-wal.pre_restore_{timestamp}.bak")
        if target_shm.exists():
            shutil.copy2(target_shm, target_db.parent / f"{target_db.name}-shm.pre_restore_{timestamp}.bak")
        print(f"   Active database snapshot successfully created.")
    else:
        print(f"\n[Step 3/6] Target database {target_db} does not exist yet (initial provisioning).")

    # Step 4: Operator confirmation gate
    print(f"\n[Step 4/6] Operator confirmation required before replacing live database.")
    print(f"   Target path to overwrite: {target_db.resolve()}")
    if not operator_confirmed:
        confirm = input("   Are you sure you want to replace the database? Type 'RESTORE' to proceed: ")
        if confirm.strip() != "RESTORE":
            print("Restore aborted by operator. Staging and snapshot files preserved.")
            return False
    else:
        print("   Operator confirmation provided via command line flag.")

    # Step 5: Replace live database & clean stale WAL files
    print(f"\n[Step 5/6] Swapping staged database into target location...")
    target_db.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(staging_file, target_db)

    # CRITICAL: Delete stale WAL and SHM files so SQLite doesn't replay old transactions over new database
    target_wal = target_db.parent / f"{target_db.name}-wal"
    target_shm = target_db.parent / f"{target_db.name}-shm"
    if target_wal.exists():
        target_wal.unlink()
        print("   Removed stale WAL journal file.")
    if target_shm.exists():
        target_shm.unlink()
        print("   Removed stale SHM index file.")

    # Clean up staging file
    if staging_file.exists():
        staging_file.unlink()

    # Step 6: Post-restore live integrity check
    print(f"\n[Step 6/6] Verifying live restored database...")
    live_ok, live_msg = verify_sqlite_integrity(target_db)
    if not live_ok:
        print(f"CRITICAL: Restored database failed final integrity check: {live_msg}", file=sys.stderr)
        return False

    final_counts = get_table_counts(target_db)
    print(f"   Final restored database integrity: PASSED")
    print(f"   Restored table counts: {final_counts}")
    print("\nDATABASE RESTORE COMPLETED SUCCESSFULLY.")
    return True


def main():
    parser = argparse.ArgumentParser(description="Smart Campus Safe Database Restore Tool")
    parser.add_argument("--backup-file", type=Path, required=True, help="Path to verified backup .db file")
    parser.add_argument("--target-db", type=Path, required=True, help="Path to target database to restore into")
    parser.add_argument("--confirm", action="store_true", help="Provide non-interactive operator confirmation")

    args = parser.parse_args()

    success = execute_safe_restore(
        backup_file=args.backup_file,
        target_db=args.target_db,
        operator_confirmed=args.confirm
    )

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
