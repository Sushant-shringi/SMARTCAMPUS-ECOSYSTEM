# 🎓 SMARTCAMPUS ECOSYSTEM
### *Next-Generation Autonomous University Academic, IoT Attendance & AI Placement Operating System*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?logo=vite)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com)
[![ChromaDB](https://img.shields.io/badge/Vector_DB-ChromaDB-FF6F61.svg)](https://www.trychroma.com)
[![Android](https://img.shields.io/badge/Android-SDK_34-3DDC84.svg?logo=android)](https://developer.android.com)

---

## 📌 Executive Overview

**SmartCampus Ecosystem** is an enterprise-grade university operating system uniting two complementary institutional pillars into a synchronized microservices architecture:

1. **SmartAttend Service:** An **offline-first campus attendance platform** powered by Bluetooth Low Energy (BLE) proximity detection, dynamic SHA-256 session token hashing, browser IndexedDB local queues, and native Android background sync workers.
2. **Career & Placement AI Service:** A **Generative AI & RAG Career Studio** featuring dense vector embeddings (`sentence-transformers/all-MiniLM-L6-v2`), local `ChromaDB` vector storage, strict grounded resume Q&A, automated ATS job description matching, STAR-format interview prep, and Google X-Y-Z bullet polishing.
3. **The Attendance-Gated Placement Bridge:** Institutional academic policy enforcement where students with $\ge 75\%$ verified attendance unlock campus recruitment drives, direct applications, and AI coaching tools.
4. **Student Privacy & Multi-Tenancy:** Secure cross-service JWT authentication ensuring complete student data isolation—resumes, chunk vectors, and RAG chats are strictly scoped to the authenticated student.

---

## 🏛️ System Architecture

```text
                               SMARTCAMPUS ECOSYSTEM
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        │                                                                 │
 [ SmartAttend Service ]                                       [ Career & Placement AI ]
  • Port: 8000 (FastAPI)                                        • Port: 8001 (FastAPI)
  • BLE Beacon Proximity Radar                                  • Sentence-Transformers Embeddings
  • Offline IndexedDB & Sync                                    • ChromaDB Vector Store (Student Isolated)
  • Room 204 Timetable Engine                                   • Grounded RAG Chatbot (No Hallucination)
  • Shared JWT Issuer (HS256)                                   • Google X-Y-Z Resume Polish & STAR Prep
        │                                                                 │
        └────────────────────────────────┬────────────────────────────────┘
                                         │
                        [ Institutional Policy Bridge ]
                 75.0% Mandatory Attendance Gate for Campus Drives
                                         │
                                         ▼
                        ┌─────────────────────────────────┐
                        │   Unified Web Portal (React 19) │
                        │   • Admin Campus Dashboard      │
                        │   • Faculty Lecture Controller  │
                        │   • Student Attendance & Studio │
                        │   • TPO Placement Hub           │
                        └─────────────────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
         [ Student Android App ]                     [ Teacher Android App ]
          • BLE Proximity Scanner                     • BLE Beacon Transmitter
          • Room DB Offline Queue                     • Embedded GATT Server
          • WorkManager Background Sync               • Live Classroom Roster
```

---

## 🚀 Key Features

### 1. Offline-First Smart Attendance (SmartAttend)
* **Zero Internet Required in Classrooms:** Students mark attendance locally inside browser IndexedDB (`smartattend_db`) or mobile Room SQLite (`AppDatabase`).
* **BLE Proximity & Anti-Spoofing:** Enforces signal strength validation ($\text{RSSI} \ge -85\text{ dBm}$) and rejects proxy check-ins outside classroom boundaries.
* **Cryptographic Token Verification:** Raw session tokens are never saved; only salted SHA-256 hashes are persisted in `attendance_sessions`.
* **Idempotent Background Synchronization:** Jetpack `WorkManager` and browser sync dispatch batched attendance queues to `POST /api/v1/sync/attendance` when internet returns.

### 2. Generative AI & RAG Career Assistant (Career & Placement AI)
* **Document Ingestion & Normalization:** Parses complex PDF resumes with ligature correction and recursive chunking.
* **Student Data Isolation:** Every resume record and vector chunk is tied to `user_id` from the verified JWT. Students can only query their own files.
* **Local Dense Embeddings:** Semantic indexing via `sentence-transformers/all-MiniLM-L6-v2` and local persistent `ChromaDB`.
* **Grounded Contextual Chat:** Strict anti-hallucination RAG with cosine similarity scores and exact chunk citations.
* **ATS Job Description Matcher:** Deterministic skill taxonomy comparison plus vector similarity scoring and gap analysis.
* **STAR Interview Coaching:** Auto-generates behavioral and technical questions derived directly from resume projects.
* **Google X-Y-Z Bullet Point Polish:** Re-architects passive job descriptions into metric-driven achievements (*"Accomplished [X] as measured by [Y] by doing [Z]"*).

### 3. Institutional Policy Bridge (Attendance-Gated Placements)
* Real-time endpoint `GET /api/placement/eligibility/me` queries verified attendance records from the attendance service / database.
* **$\ge 75\%$ Attendance:** Displays green shield; unlocks Google, Microsoft, and TCS campus drives, direct applications, and AI coaching.
* **$< 75\%$ Attendance:** Automatically places account on Deficit Hold with advice on makeup classes and medical leave workflows.
* **Fail-Safe Policy:** If attendance records cannot be verified or the attendance service is unreachable, eligibility is never granted automatically.

---

## 🛠️ Technology Stack

* **Frontend:** React 19, Vite 8, Tailwind CSS, Lucide React, Recharts, Dexie.js (IndexedDB).
* **Backend Services:** Python 3.12, FastAPI, SQLAlchemy, Pydantic v2, PyJWT (HS256).
* **AI & NLP:** Google Gemini API (`google-genai`), Local Ollama (Llama 3.2), Sentence-Transformers, ChromaDB, PyMuPDF.
* **Mobile (Android):** Kotlin, Jetpack Compose, Room Database, WorkManager, Android Bluetooth LE API.
* **DevOps:** Docker, Docker Compose, Nginx.

---

## ⚡ Quick Start

### Option A: One-Click Docker Compose
```bash
# Clone the repository
git clone https://github.com/Sushant-shringi/SMARTCAMPUS-ECOSYSTEM.git
cd SMARTCAMPUS-ECOSYSTEM

# Start all microservices and web portal
docker compose up --build
```
* **Unified Web Portal:** `http://localhost:5173`
* **Attendance Service API:** `http://localhost:8000/docs`
* **Career AI Service API:** `http://localhost:8001/docs`

---

### Option B: Local Development (Terminal Setup)

#### Terminal 1: Attendance Service (Port 8000)
```powershell
cd "D:\SMARTCAMPUS ECOSYSTEM\services\attendance-service"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```
- **Swagger Documentation:** `http://localhost:8000/docs`
- **Health Endpoint:** `http://localhost:8000/health`

#### Terminal 2: Career & Placement AI Service (Port 8001)
```powershell
cd "D:\SMARTCAMPUS ECOSYSTEM\services\career-ai-service"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```
- **Swagger Documentation:** `http://localhost:8001/docs`
- **Health Endpoint:** `http://localhost:8001/api/health`

#### Terminal 3: Unified Web Portal (Port 5173)
```powershell
cd "D:\SMARTCAMPUS ECOSYSTEM\web-portal"
npm install
npm run dev
```
- **Web Portal URL:** `http://localhost:5173`

---

## 🧪 Automated Testing

### 1. Career AI Service Tests (Auth, Student Isolation & Eligibility)
```powershell
cd "D:\SMARTCAMPUS ECOSYSTEM\services\career-ai-service"
python -m pytest tests/
```

### 2. Attendance Service Tests
```powershell
cd "D:\SMARTCAMPUS ECOSYSTEM\services\attendance-service"
python -m pytest tests/
```

### 3. Frontend Static Analysis & Lint
```powershell
cd "D:\SMARTCAMPUS ECOSYSTEM\web-portal"
npm run lint
```

### 4. Docker Compose Configuration Validation
```powershell
cd "D:\SMARTCAMPUS ECOSYSTEM"
docker compose config -q
```

---

## 🔑 Pre-Seeded Test Accounts

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `admin123` | Campus hierarchy, timetables, approval requests, audit logs |
| **Faculty / Teacher** | `teacher1` | `teacher123` | Start attendance, schedule, live roster |
| **Student** | `student1` | `student123` | Aarav Mehta (85% attendance, placement eligible) |
| **Student (Deficit)**| `student2` | `student123` | Diya Sharma (attendance deficit warning) |

---

## ⚙️ Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `JWT_SECRET` | `super-secret-smartattend-key-...` | Shared HMAC secret for cross-service JWT issuance & verification |
| `ATTENDANCE_PORT` | `8000` | Port for SmartAttend FastAPI service |
| `CAREER_PORT` | `8001` | Port for Career AI FastAPI service |
| `ATTENDANCE_SERVICE_URL` | `http://localhost:8000` | HTTP URL for Career AI to query student attendance |
| `VITE_ATTENDANCE_API_URL` | `http://localhost:8000/api/v1` | Web portal attendance API base URL |
| `VITE_CAREER_API_URL` | `http://localhost:8001/api` | Web portal career AI base URL |
| `MINIMUM_ATTENDANCE_PLACEMENT_THRESHOLD` | `75.0` | Minimum attendance percentage to unlock placement drives |
| `LLM_PROVIDER` | `gemini` | Generative AI provider (`gemini` or `ollama`) |
| `GEMINI_API_KEY` | *(optional)* | Google Gemini API key for external LLM calls |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local Ollama base URL if using local LLM |

---

## 📌 Known Limitations (Phase 1)

1. **LLM Execution:** RAG chat and Google X-Y-Z bullet polish require either a valid `GEMINI_API_KEY` or a locally running Ollama instance with model `llama3.2`. If neither is configured, the backend reports `llm_status: disconnected`.
2. **Campus Drive Submissions:** The "Apply with Active Resume" button in the Student Placement Hub is a client-side interface workflow; database persistence for company applications is scheduled for Phase 2.
3. **Android Branding:** Pre-built APKs in `mobile/apks` are compiled for standalone SmartAttend.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
