#!/usr/bin/env bash
# ==============================================================================
# Smart Campus Ecosystem - SQLite Online Backup Automation (Bash)
# Performs safe, non-destructive online backups using SQLite's online backup API.
# Supports both Local Development and Docker Named Volumes.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="local"
OUTPUT_DIR="backups"
RETAIN_COUNT=7
APPLY_RETENTION=0
EXECUTE_PRUNE=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --mode|-m)
      MODE="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
      shift 2
      ;;
    --output-dir|-o)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --retain-count|-r)
      RETAIN_COUNT="$2"
      APPLY_RETENTION=1
      shift 2
      ;;
    --apply-retention)
      APPLY_RETENTION=1
      shift
      ;;
    --execute-prune)
      EXECUTE_PRUNE=1
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--mode local|docker] [--output-dir path] [--retain-count 7] [--apply-retention] [--execute-prune]"
      exit 1
      ;;
  esac
done

cd "${PROJECT_ROOT}"

echo "=========================================================="
echo " SMART CAMPUS ECOSYSTEM - SQLITE ONLINE BACKUP AUTOMATION"
echo " Mode: ${MODE}"
echo "=========================================================="

ENGINE_SCRIPT="${PROJECT_ROOT}/scripts/sqlite_backup_engine.py"
if [[ ! -f "${ENGINE_SCRIPT}" ]]; then
  echo "Error: Backup engine script not found at ${ENGINE_SCRIPT}"
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

if [[ "${MODE}" == "local" ]]; then
  ATT_DB="${PROJECT_ROOT}/services/attendance-service/smartattend.db"
  CAR_DB="${PROJECT_ROOT}/services/career-ai-service/data/career_assistant.db"
  if [[ ! -f "${CAR_DB}" ]]; then
    CAR_DB="${PROJECT_ROOT}/services/career-ai-service/career_assistant.db"
  fi

  echo "[Local Mode] Source Attendance DB: ${ATT_DB}"
  echo "[Local Mode] Source Career AI DB:  ${CAR_DB}"

  RETENTION_FLAGS=""
  if [[ ${APPLY_RETENTION} -eq 1 ]]; then
    RETENTION_FLAGS="--apply-retention --retain-count ${RETAIN_COUNT}"
    if [[ ${EXECUTE_PRUNE} -eq 1 ]]; then
      RETENTION_FLAGS="${RETENTION_FLAGS} --execute-prune"
    fi
  fi

  python3 "${ENGINE_SCRIPT}" \
    --attendance-db "${ATT_DB}" \
    --career-db "${CAR_DB}" \
    --output-dir "${OUTPUT_DIR}" \
    --mode local \
    ${RETENTION_FLAGS}

  echo ""
  echo "[SUCCESS] Local SQLite online backup completed and verified."

elif [[ "${MODE}" == "docker" ]]; then
  echo "[Docker Mode] Checking for active containers or named volumes..."

  if docker ps -q -f name=smartcampus-attendance >/dev/null 2>&1 && \
     docker ps -q -f name=smartcampus-career-ai >/dev/null 2>&1; then
    echo "Smart Campus containers are running. Executing in-container backup..."

    docker cp "${ENGINE_SCRIPT}" smartcampus-attendance:/tmp/sqlite_backup_engine.py
    docker exec smartcampus-attendance python /tmp/sqlite_backup_engine.py \
      --attendance-db /app/data/smartattend.db \
      --output-dir /app/data/backups \
      --mode docker

    docker cp "${ENGINE_SCRIPT}" smartcampus-career-ai:/tmp/sqlite_backup_engine.py
    docker exec smartcampus-career-ai python /tmp/sqlite_backup_engine.py \
      --career-db /app/data/career_assistant.db \
      --output-dir /app/data/backups \
      --mode docker

    TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
    HOST_BACKUP_DIR="${OUTPUT_DIR}/docker_${TIMESTAMP}"
    mkdir -p "${HOST_BACKUP_DIR}"

    docker cp smartcampus-attendance:/app/data/backups/. "${HOST_BACKUP_DIR}/"
    docker cp smartcampus-career-ai:/app/data/backups/. "${HOST_BACKUP_DIR}/"

    echo ""
    echo "[SUCCESS] Docker container online backup completed. Extracted to: ${HOST_BACKUP_DIR}"

  else
    echo "Containers not running. Performing safe read-only backup from named volumes via helper container..."
    TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
    HOST_BACKUP_DIR="${OUTPUT_DIR}/volume_${TIMESTAMP}"
    mkdir -p "${HOST_BACKUP_DIR}"

    docker run --rm \
      -v attendance-data:/data/attendance:ro \
      -v career-data:/data/career:ro \
      -v "${PROJECT_ROOT}:/repo:ro" \
      -v "$(pwd)/${HOST_BACKUP_DIR}:/backups" \
      python:3.11-slim \
      python /repo/scripts/sqlite_backup_engine.py \
        --attendance-db /data/attendance/smartattend.db \
        --career-db /data/career/career_assistant.db \
        --output-dir /backups \
        --mode docker

    echo ""
    echo "[SUCCESS] Docker named-volume backup completed and verified at: ${HOST_BACKUP_DIR}"
  fi
else
  echo "Invalid mode: ${MODE}. Expected 'local' or 'docker'."
  exit 1
fi
