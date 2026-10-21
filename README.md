# Expandit Smart Employee Attendance, Analytics & Leave Management System

A production-ready, secure, and responsive Employee Attendance, Real-Time Analytics, and Leave Management System built for **Expandit**. Designed with a modern, creative light glassmorphic UI/UX adhering to the official Expandit corporate branding.

---

## 🚀 Key Features

### 1. Reusable Employee Attendance Portal
- **Mobile-Friendly & Accessible**: Secured through reusable individual employee token links (e.g. `http://localhost:5173/#portal?token=...`).
- **Atomic Operations**: Single authoritative daily record per employee per date in PostgreSQL.
- **Server Timestamps**: Check-in and check-out are recorded authoritatively in UTC and displayed in company timezone (`Asia/Kolkata`).
- **Present Workflow**: Choose between **Full Day** and **Half Day**. Automatically tracks late arrivals against the 15-minute shift grace threshold.
- **Leave / Absence Workflow**: Submit **CL (Casual Leave)**, **PL (Privilege Leave)**, or **Medical Leave** with mandatory document uploads (PDF, JPG, PNG with server-side magic byte validation). All requests start in `PENDING` status.

### 2. Admin Analytics Dashboard
- **12 Top-Level KPI Cards**:
  1. Total Active Workforce
  2. Present Employees (with period comparison)
  3. Full-Day Attendance
  4. Half-Day Attendance
  5. Absent Employees
  6. Currently Checked In
  7. Checked Out Today
  8. Pending Leave Requests
  9. Approved Leaves
  10. Rejected Leaves
  11. Missing Check-Outs
  12. Late Arrivals
- **Interactive Visualizations (Recharts)**:
  - Daily Attendance Distribution Donut Chart
  - Time-series Attendance Trendlines (Daily / Weekly / Monthly intervals)
  - Department-Wise Attendance Benchmarks
  - Leave Distribution by Type & Status
  - Average Daily Working Hours Analysis
  - Performance & Attendance Matrix Table
- **Real-Time Live Updates**: Server-Sent Events (SSE) stream automatically broadcasts live check-ins, check-outs, and leave submissions to the admin dashboard.

### 3. Dedicated Individual Employee Dashboards
> **Access Policy**: In this initial release, individual employee dashboards are **strictly restricted to authorized administrators**. Employee access remains disabled on both frontend routes and backend APIs.
- Filterable date-range analysis.
- Complete employee profile, shift schedules, and individual KPI metrics.
- Monthly interactive attendance calendar with color-coded status badges (Present, Half Day, Absent, Approved Leave, Holiday, Weekly Off, Incomplete).
- Single-employee Excel workbook (.xlsx) and CSV exports.

### 4. Excel & CSV Export System
- **Company-Wide Multi-Sheet Excel Workbook**:
  1. `Attendance Records`
  2. `Employee Directory`
  3. `Leave Requests`
  4. `Working Hours`
  5. `Attendance Summary`
  6. `Exceptions`
- **Formula Injection Protection**: Every export field starting with `=`, `+`, `-`, `@`, or tabs is safely sanitized.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts |
| **Backend** | Python 3.14, FastAPI, SQLAlchemy 2.0, Psycopg 3 (binary), Pydantic v2 |
| **Database** | PostgreSQL 18 running locally |
| **File Storage** | Protected local directory (`backend/storage/uploads`) outside public root |
| **Real-time** | Server-Sent Events (SSE) `/api/events/stream` |

---

## 💻 Local Setup & Execution

### Prerequisites
- Python 3.14 (or 3.11+)
- Node.js 20+ & npm
- PostgreSQL 18 (running on `localhost:5432`)

### 1. Database Configuration
The local PostgreSQL database `attendance_system` and user `attendance_user` are already provisioned.
- **Database Name**: `attendance_system`
- **User**: `attendance_user`
- **Password**: `attendance_pass_2026`
- **Connection String**: `postgresql+psycopg://attendance_user:attendance_pass_2026@localhost:5432/attendance_system`

### 2. Starting the Backend Server
Open a Windows PowerShell terminal:
```powershell
.\start_backend.ps1
```
*Alternatively, run manually:*
```powershell
cd D:\Attendance_system\backend
.\.venv\Scripts\python.exe run.py
```
Backend will be available at: **`http://localhost:8000`**  
Interactive API Docs (Swagger): **`http://localhost:8000/docs`**

### 3. Starting the Frontend Server
Open a second Windows PowerShell terminal:
```powershell
.\start_frontend.ps1
```
*Alternatively, run manually:*
```powershell
cd D:\Attendance_system\frontend
npm run dev
```
Frontend will be available at: **`http://localhost:5173`**

---

## 🔐 Default Administrator Credentials

- **Username**: `admin`
- **Password**: `Sandeep@2010`
- **Role**: `ADMIN`

---

## 👥 Seeded Employees & Portal Links

| Employee ID | Name | Department | Token Link |
| :--- | :--- | :--- | :--- |
| **EXP-101** | Aarav Sharma | Engineering | `http://localhost:5173/#portal?token=token_aarav_sharma_exp101_secure` |
| **EXP-102** | Priya Nair | Product & Design | `http://localhost:5173/#portal?token=token_priya_nair_exp102_secure` |
| **EXP-103** | Rohan Patel | Marketing | `http://localhost:5173/#portal?token=token_rohan_patel_exp103_secure` |
| **EXP-104** | Sneha Kulkarni | Engineering | `http://localhost:5173/#portal?token=token_sneha_kulkarni_exp104_secure` |
| **EXP-105** | Vikram Singh | Human Resources | `http://localhost:5173/#portal?token=token_vikram_singh_exp105_secure` |

---

## 🧪 Running Automated Tests

Run the backend test suite:
```powershell
cd D:\Attendance_system\backend
.\.venv\Scripts\pytest.exe -v
```
All 9 automated unit and integration tests verify:
- Formula injection escaping
- Authoritative health & login
- Reusable token portal info
- Idempotent check-in & single daily record constraint
- Check-out updates existing record without duplicate rows
- Unauthorized dashboard access blocks
- Leave submission with supporting file upload
- Multi-sheet Excel and CSV export generation

---

## 💾 Database Backup & Restore

### Backup
```powershell
.\backup_database.ps1
```
Creates a timestamped `.sql` backup file in the root directory.

### Restore
```powershell
.\restore_database.ps1 -BackupFile ".\backup_attendance_system_20261021_XXXXXX.sql"
```
Restores the database schema and all attendance records.
