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
  • Offline IndexedDB & Sync                                    • ChromaDB Vector Store
  • Room 204 Timetable Engine                                   • Grounded RAG Chatbot (No Hallucination)
  • Immutable Forensic Audit Trail                              • Google X-Y-Z Resume Polish & STAR Prep
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
* **Local Dense Embeddings:** Semantic indexing via `sentence-transformers/all-MiniLM-L6-v2` and local persistent `ChromaDB`.
* **Grounded Contextual Chat:** Strict anti-hallucination RAG with cosine similarity scores and exact chunk citations.
* **ATS Job Description Matcher:** Deterministic skill taxonomy comparison plus vector similarity scoring and gap analysis.
* **STAR Interview Coaching:** Auto-generates behavioral and technical questions derived directly from resume projects.
* **Google X-Y-Z Bullet Point Polish:** Re-architects passive job descriptions into metric-driven achievements (*"Accomplished [X] as measured by [Y] by doing [Z]"*).

### 3. Institutional Policy Bridge (Attendance-Gated Placements)
* Real-time endpoint `GET /api/placement/eligibility/{student_id}` checks verified attendance records.
* **$\ge 75\%$ Attendance:** Displays green shield; unlocks Google, Microsoft, and TCS campus drives, direct applications, and AI coaching.
* **$< 75\%$ Attendance:** Automatically places account on Deficit Hold with advice on makeup classes and medical leave workflows.

---

## 👥 Role-Based Portals

| Role | Primary Responsibilities | Dedicated Features |
| :--- | :--- | :--- |
| **Institutional Admin** | Campus operations & global governance | Faculty approval, department/semester hierarchy, timetable assignments, compliance reports, forensic audit trails. |
| **Faculty / Teacher** | Classroom lecture execution | Scheduled lecture view, one-click BLE attendance start, live classroom roster auto-polling, leave approvals. |
| **Student** | Daily check-in & career readiness | 1-click BLE attendance radar, offline queue, attendance health meter, AI resume studio, campus placement applications. |
| **TPO / Placement Cell** | Industry recruitment coordination | Registering campus recruitment drives, setting CTC packages, enforcing attendance cutoffs, tracking placement analytics. |

---

## 🛠️ Technology Stack

* **Frontend:** React 19, Vite 8, Tailwind CSS, Lucide React, Recharts, Dexie.js (IndexedDB).
* **Backend Services:** Python 3.12, FastAPI, SQLAlchemy, Pydantic v2, JWT (HS256).
* **AI & NLP:** Google Gemini API (`google-genai`), Local Ollama (Llama 3.2), Sentence-Transformers, ChromaDB, PyMuPDF.
* **Mobile (Android):** Kotlin, Jetpack Compose, Room Database, WorkManager, Android Bluetooth LE API.
* **DevOps:** Docker, Docker Compose, Nginx, Vercel SPA deployment.

---

## ⚡ Quick Start

### Option A: One-Click Docker Compose (Recommended)
```bash
# Clone the repository
git clone https://github.com/Sushant-shringi/SMARTCAMPUS-ECOSYSTEM.git
cd SMARTCAMPUS-ECOSYSTEM

# Start all microservices and web portal
docker-compose up --build
```
* **Unified Web Portal:** `http://localhost:5173`
* **Attendance Service API:** `http://localhost:8000/docs`
* **Career AI Service API:** `http://localhost:8001/docs`

### Option B: Local Development
#### 1. Attendance Service
```bash
cd services/attendance-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

#### 2. Career & Placement AI Service
```bash
cd services/career-ai-service
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

#### 3. Unified Web Portal
```bash
cd web-portal
npm install
npm run dev
```

---

## 📂 Project Structure

```text
SMARTCAMPUS-ECOSYSTEM/
├── services/
│   ├── attendance-service/      # FastAPI Attendance & BLE Engine (Port 8000)
│   └── career-ai-service/       # FastAPI ChromaDB & RAG GenAI Engine (Port 8001)
├── web-portal/                  # Unified React + Vite + Tailwind Frontend
├── mobile/
│   ├── student-app/             # Native Android Student BLE Scanner & Room DB
│   └── teacher-app/             # Native Android Teacher BLE Advertiser & GATT
├── docs/
│   ├── ARCHITECTURE.md          # Complete microservice topology
│   └── screenshots/             # High-definition application screenshots
├── docker-compose.yml           # Multi-container orchestration
├── .env.example                 # Configuration template
├── .gitignore
└── README.md
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
