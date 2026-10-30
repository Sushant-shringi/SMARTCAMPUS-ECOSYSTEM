# Smart Campus Ecosystem — Manual Testing & Acceptance Checklist

**Release Commit:** `e046cda`  
**Date:** 2026-10-30  
**Environment:** Docker Compose Production Deployment (`smartcampus-attendance:8005`, `smartcampus-career-ai:8001`, `smartcampus-web-portal:5173`)  
**Portal URL:** `http://localhost:5173`

> [!NOTE]  
> All checkboxes below are initially unmarked (`[ ]`). Mark them as passed only after performing the test manually in a browser or API client.

---

### Test Credentials Reference

| Role | Username | Password | Purpose / Profile |
| :--- | :--- | :--- | :--- |
| **Student 1** | `student1` | `student123` | Aarav Mehta (MCA, 88.5% attendance, **ELIGIBLE**) |
| **Student 2** | `student2` | `student123` | Diya Sharma (MCA, 19.2% attendance, **DEFICIT / LOCKED**) |
| **Teacher** | `teacher1` | `teacher123` | Prof. Sharma (Data Engineering) |
| **TPO** | `tpo` | `tpo123` | Training & Placement Officer |
| **Admin** | `admin` | `admin123` | System Administrator |

---

### Scenario 1: Student Authentication
- [ ] Navigate to `http://localhost:5173/login`.
- [ ] Enter username `student1` and password `student123`.
- [ ] Click **Sign In**.
- [ ] Verify successful login and automatic redirection to the Student Dashboard.
- [ ] Verify JWT token stored securely in localStorage (`token`).
- [ ] Verify logging out clears the session and redirects to `/login`.

---

### Scenario 2: Student Dashboard & Theme Switching
- [ ] Log in as `student1`.
- [ ] Verify profile banner displays "Aarav Mehta" and department "Computer Applications (MCA)".
- [ ] Verify quick navigation cards: Attendance, AI Career Assistant, Placement Drives, My Applications.
- [ ] Open the Theme Selector in the top navigation bar.
- [ ] Test switching across all 5 themes:
  - [ ] Indigo Modern (Default)
  - [ ] Emerald Academic
  - [ ] Dark Slate
  - [ ] Sunset Amber
  - [ ] Royal Violet
- [ ] Verify UI components re-render with matching palettes without layout shifts.

---

### Scenario 3: Attendance History & BLE Session Verification
- [ ] Navigate to **Attendance** view as `student1`.
- [ ] Verify overall attendance percentage is displayed (>= 75.0%, expected ~88.5%).
- [ ] Verify subject-wise breakdown shows MCA201 (Data Engineering).
- [ ] Verify recent attendance records list timestamps, statuses (`PRESENT`), and verification method (`BLE`).
- [ ] Verify no "Low Attendance Warning" banner is shown for `student1`.

---

### Scenario 4: Resume Upload & ATS Parsing
- [ ] Navigate to **AI Career & Resume Assistant** (`/career/resumes`).
- [ ] Click **Upload Resume** and select a PDF file (e.g., student resume).
- [ ] Verify upload progress bar and success toast notification.
- [ ] Verify resume appears in **My Resumes** table with filename, upload date, and active status.
- [ ] Click **View ATS Analysis** on the uploaded resume.
- [ ] Verify extracted technical skills, education, and experience sections are parsed accurately.

---

### Scenario 5: AI Career Assistant & RAG Chat
- [ ] In Career Assistant, select the uploaded resume and click **Job Description Matcher**.
- [ ] Paste a target job description (e.g. "Full Stack Cloud Engineer with FastAPI and Docker").
- [ ] Click **Analyze Match**.
- [ ] Verify match percentage score, matched skills list, missing skills list, and tailored suggestions.
- [ ] Open the **RAG Resume Chat** interface.
- [ ] Ask a query: *"What are my top backend skills based on my resume?"*.
- [ ] Verify response cites exact content from the student's uploaded resume chunks without hallucinating.

---

### Scenario 6: Placement Eligibility Gate (Institutional Attendance Rule)
- [ ] Log in as `student1` (Aarav Mehta, attendance 88.5%):
  - [ ] Navigate to **Placement Drives** (`/placement/drives`).
  - [ ] Verify green status pill: **ELIGIBLE** (Attendance: 88.5% >= 75.0% threshold).
  - [ ] Verify "Apply" buttons are active and enabled on open drives.
- [ ] Log out and log in as `student2` (Diya Sharma, attendance 19.2%):
  - [ ] Navigate to **Placement Drives**.
  - [ ] Verify amber/red status pill: **DEFICIT_WARNING / LOCKED** (Attendance: 19.2% < 75.0% threshold).
  - [ ] Verify eligibility message clearly states attendance deficit and requirement.
  - [ ] Verify "Apply" buttons are disabled or display attendance gate warning.

---

### Scenario 7: Placement Application Submission
- [ ] Log in as `student1`.
- [ ] Open an active drive with status `OPEN` (e.g. "Google Cloud - Cloud DevOps Associate").
- [ ] Click **Apply Now**.
- [ ] Select active resume from the dropdown.
- [ ] Add applicant remarks and click **Submit Application**.
- [ ] Verify success toast notification.
- [ ] Navigate to **My Applications** (`/placement/applications`).
- [ ] Verify the application appears with status `APPLIED` and current timestamp.

---

### Scenario 8: Duplicate Application Prevention
- [ ] While logged in as `student1`, return to the same drive applied for in Scenario 7.
- [ ] Attempt to click **Apply Now** or submit a second application payload.
- [ ] Verify the system rejects duplicate submission with an error: *"You have already applied for this placement drive"*.
- [ ] Verify no second application entry is created in **My Applications**.

---

### Scenario 9: TPO Authentication & Dashboard
- [ ] Log out and navigate to `/login`.
- [ ] Log in with username `tpo` and password `tpo123`.
- [ ] Verify redirection to the **TPO Management Portal** (`/tpo`).
- [ ] Verify dashboard summary widgets: Total Drives, Active Drives, Total Applicants, Shortlisted Candidates.
- [ ] Verify Student and Teacher views are inaccessible or scoped to TPO permissions.

---

### Scenario 10: Placement Drive Management (Create, Edit, Close)
- [ ] In TPO Portal, click **Create Placement Drive**.
- [ ] Test validation:
  - [ ] Submit empty fields -> verify client/backend validation rejects.
  - [ ] Enter negative salary (e.g. `-50000`) -> verify rejected.
  - [ ] Enter past deadline -> verify rejected.
- [ ] Enter valid details:
  - Company: "Atlassian Systems"
  - Role: "Site Reliability Engineer"
  - CTC: "18.5 LPA"
  - Minimum Attendance: `75.0%`
  - Deadline: 14 days in future
- [ ] Click **Publish Drive** -> verify drive appears in active drives table.
- [ ] Click **Edit Drive** -> update role title or CTC -> verify changes persist.
- [ ] Click **Close Drive** -> verify drive status transitions to `CLOSED`.

---

### Scenario 11: Applicant Management & Status Audit Trail
- [ ] In TPO Portal, select drive with applicants (e.g. Google Cloud).
- [ ] Click **View Applicants**.
- [ ] Locate `student1` (Aarav Mehta) application.
- [ ] Change status from `APPLIED` to `SHORTLISTED` with remarks *"Resume shortlisted for technical round"*.
- [ ] Verify status updates immediately in the UI.
- [ ] Change status from `SHORTLISTED` to `INTERVIEW_SCHEDULED` with remarks *"Round 1 scheduled for Friday 10:00 AM"*.
- [ ] Click **View Audit History**.
- [ ] Verify audit log displays both state transitions:
  - [ ] `APPLIED` -> `SHORTLISTED` (by `tpo`, with timestamp and remarks)
  - [ ] `SHORTLISTED` -> `INTERVIEW_SCHEDULED` (by `tpo`, with timestamp and remarks)

---

### Scenario 12: Admin Dashboard & System Compliance
- [ ] Log out and log in with username `admin` and password `admin123`.
- [ ] Navigate to the **Admin Dashboard** (`/admin`).
- [ ] Verify institutional statistics:
  - Total registered students, teachers, classrooms, departments.
  - Overall campus attendance rate.
  - Placement participation metrics.
- [ ] Verify security and compliance overview displays active audit logs and healthy system services.

---

### Scenario 13: Role-Based Access Control (RBAC) & Security Boundaries
- [ ] Log in as `student1`.
- [ ] Attempt to manually navigate to `/tpo` -> verify redirection or HTTP 403 Forbidden.
- [ ] Attempt to manually navigate to `/admin` -> verify redirection or HTTP 403 Forbidden.
- [ ] Attempt to call `POST http://localhost:8001/api/placement/drives` using student JWT -> verify HTTP 403.
- [ ] Attempt to view `student2` applications via API using `student1` token -> verify HTTP 403/404 isolation.
- [ ] Attempt to use another student's resume ID in application payload -> verify HTTP 403 *"You do not own this resume"*.

---

### Scenario 14: Audit Logging Verification
- [ ] Log in as `admin`.
- [ ] Open the **Audit Logs** view.
- [ ] Verify recent security and lifecycle events are logged:
  - [ ] User login events.
  - [ ] Placement drive creation and status updates.
  - [ ] Application submissions and status transitions.
- [ ] Verify each audit log contains timestamp (UTC), user identifier, action name, and IP/source metadata.

---

### Scenario 15: Offline Check-In & Network Reconnection Simulation
- [ ] Log in as `student1` on a browser session.
- [ ] Open Developer Tools (F12) -> **Network** tab -> select **Offline**.
- [ ] Trigger an attendance check-in or action.
- [ ] Verify the action is enqueued in the browser's IndexedDB offline queue (`smartcampus_sync_queue`).
- [ ] Verify UI indicates offline state without crashing.
- [ ] Switch Developer Tools Network tab back to **Online**.
- [ ] Verify the background sync queue automatically flushes pending items to the backend API (`/api/v1/student/mark-attendance` or sync endpoint) and marks status `SYNCED`.
