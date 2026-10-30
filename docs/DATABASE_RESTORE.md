# Smart Campus Ecosystem - Database Restore Runbook

**Scope:** Smart Attendance Service (`smartattend.db`) & Career/Placement AI Assistant (`career_assistant.db`)
**Storage Architecture:** SQLite with Write-Ahead Logging (`journal_mode=WAL`, `synchronous=NORMAL`)
**Target Environments:** Local Developer Workstation & Docker Compose Containerized Deployments

---

## 1. Safety Principles & Guardrails

1. **Never Overwrite a Live Database Directly:** A restored file must first be staged in an isolated destination and verified with `PRAGMA integrity_check;` before any filesystem replacement is initiated.
2. **Always Snapshot Current State First:** Before overwriting any existing database file, the live `.db`, along with any accompanying `-wal` and `-shm` files, must be backed up to a timestamped `.pre_restore_<TIMESTAMP>.bak` file.
3. **Always Stop Active Writers First:** Restoring a database while backend services are actively writing causes database locks, corruption, or split-brain journal replays.
4. **Mandatory WAL Cleanup Upon Restore:** When restoring a standalone database into a WAL-enabled directory, all preexisting `-wal` (Write-Ahead Log) and `-shm` (Shared Memory) files must be removed. If left in place, SQLite's recovery process may attempt to replay stale transactions from the previous database over the newly restored database.
5. **Operator Confirmation Gate:** Automated scripts must never perform production replacement without explicit manual confirmation (`--confirm` flag or interactive prompt).

---

## 2. Pre-Restore Checklist

- [ ] Identify which backup file and manifest to restore from (located in `backups/<TIMESTAMP>/` or specified by manifest).
- [ ] Verify disk space (at least 3x the database size to accommodate staging, backup snapshot, and final restored file).
- [ ] Coordinate maintenance window or temporarily stop the backend service writing to the target database.

---

## 3. Step-by-Step Restoration Procedure

### Step 3.1: Stop Active Service Writers

#### For Docker Compose Deployments:
Stop the writing container to release file locks:
```bash
# To restore Attendance DB
docker compose stop attendance-service

# To restore Career AI DB
docker compose stop career-ai-service
```

#### For Local Development:
Terminate running `uvicorn` processes on ports 8000/8005 or 8001.

---

### Step 3.2: Verify Backup Integrity in Isolation
Before attempting restore, verify the integrity of the backup artifact using SQLite's built-in integrity check:
```bash
# Inspect backup database using SQLite in read-only mode
python -c "import sqlite3; conn = sqlite3.connect('file:backups/20261030_125150Z/smartattend_20261030_125150Z.db?mode=ro', uri=True); print(conn.execute('PRAGMA integrity_check;').fetchall())"
```
The output **must** be `[('ok',)]`. If any other result or error appears, the backup is corrupt and must **NOT** be used.

---

### Step 3.3: Execute Safe Restoration via Restore Utility

The project provides an automated, guarded restore utility: [restore_database.py](file:///D:/SMARTCAMPUS%20ECOSYSTEM/scripts/restore_database.py).

#### A. Interactive Mode (Recommended for Manual Operators):
```bash
python scripts/restore_database.py \
  --backup-file "backups/20261030_125150Z/smartattend_20261030_125150Z.db" \
  --target-db "services/attendance-service/smartattend.db"
```
The operator will be prompted:
```text
Are you sure you want to replace the database? Type 'RESTORE' to proceed:
```

#### B. Automated / Scripted Mode:
Pass `--confirm` only when running within an authenticated CI/CD pipeline or controlled recovery orchestrator:
```bash
python scripts/restore_database.py \
  --backup-file "backups/20261030_125150Z/career_assistant_20261030_125150Z.db" \
  --target-db "services/career-ai-service/data/career_assistant.db" \
  --confirm
```

---

### Step 3.4: Restoring into Docker Named Volumes

When running under Docker Compose, databases reside in Docker named volumes (`attendance-data` and `career-data` mounted at `/app/data`).

1. **Stop the container:**
   ```bash
   docker compose stop attendance-service
   ```
2. **Execute restore into the volume using a temporary Alpine container:**
   ```bash
   docker run --rm \
     -v attendance-data:/data \
     -v "${PWD}/backups/20261030_125150Z:/backup_src:ro" \
     alpine sh -c "
       echo 'Creating pre-restore backup in volume...' && \
       cp /data/smartattend.db /data/smartattend.db.pre_restore_\$(date +%s).bak 2>/dev/null || true && \
       echo 'Copying verified backup...' && \
       cp /backup_src/smartattend_20261030_125150Z.db /data/smartattend.db && \
       echo 'Cleaning stale WAL files...' && \
       rm -f /data/smartattend.db-wal /data/smartattend.db-shm
     "
   ```
3. **Start the container:**
   ```bash
   docker compose start attendance-service
   ```
4. **Verify container health:**
   ```bash
   docker compose ps attendance-service
   curl -I http://localhost:8005/api/v1/health
   ```

---

## 4. Post-Restoration Verification & Regression Checks

Once the database has been restored and the services restarted, perform the following verifications:

1. **Healthcheck Query:**
   ```bash
   # Attendance Service
   curl http://localhost:8005/docs

   # Career AI Service
   curl http://localhost:8001/api/health
   ```
2. **Record Count Sanity Check:**
   Confirm core records are present:
   - Placement drives (minimum 19)
   - Placement applications (minimum 10)
   - Attendance records (minimum 48)
3. **Run Regression Tests:**
   ```bash
   python tests/test_e2e_integration.py
   python tests/test_placement_system.py
   ```
