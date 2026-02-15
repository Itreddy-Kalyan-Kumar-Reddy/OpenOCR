# BillScan AI

**Intelligent Billing Document OCR & Data Extraction Platform**

BillScan AI is a full-stack application that uses EasyOCR to extract text from billing documents (invoices, receipts, purchase orders) and intelligently parses key-value fields like invoice numbers, amounts, dates, and vendor information — with one-click Excel export.

Built with **FastAPI** (Python) + **React** (Vite), designed as an enterprise-grade SaaS platform.

---

## Features

- **Document Upload** — Drag-and-drop support for PDF, PNG, JPG, TIFF, BMP, WebP
- **OCR Text Extraction** — EasyOCR-powered with 95%+ accuracy on clear scans
- **AI Field Detection** — Auto-detects 12+ billing fields (invoice number, date, total, vendor, tax, etc.)
- **Key-Value Extraction** — Regex + optional Ollama LLM hybrid engine
- **Excel Export** — Styled `.xlsx` with extracted data + confidence scores
- **User Authentication** — JWT-based with SHA-256 password hashing
- **Enterprise UI** — Dark-themed, responsive design inspired by Stripe/Linear/Notion

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy, EasyOCR, openpyxl |
| **Frontend** | React 19, Vite 7, React Router 7 |
| **Database** | SQLite (via SQLAlchemy ORM) |
| **Auth** | JWT (python-jose), SHA-256 + salt password hashing |
| **OCR Engine** | EasyOCR (English) |
| **Styling** | Vanilla CSS with custom enterprise design system |

---

## Project Structure

```
OCR Application/
├── server/                 # FastAPI Backend
│   ├── main.py             # Application entry point
│   ├── auth.py             # JWT authentication & user management
│   ├── routes.py           # API endpoints (upload, OCR, extract, export)
│   ├── database.py         # SQLAlchemy models & database setup
│   ├── ocr_engine.py       # EasyOCR integration
│   ├── extractor.py        # Key-value field extraction engine
│   ├── excel_export.py     # Styled Excel report generation
│   └── requirements.txt    # Python dependencies
│
├── client/                 # React Frontend
│   ├── src/
│   │   ├── App.jsx         # Main layout with sidebar navigation
│   │   ├── api.js          # API client with JWT handling
│   │   ├── index.css       # Enterprise design system
│   │   └── pages/
│   │       ├── AuthPage.jsx       # Split-screen login/signup
│   │       ├── UploadPage.jsx     # Document upload with drag-and-drop
│   │       ├── JobsDashboard.jsx  # Job monitoring dashboard
│   │       └── JobDetail.jsx      # OCR → Extract → Export workflow
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Getting Started

### Prerequisites

- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **pip** (Python package manager)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "OCR Application"
```

### 2. Backend Setup

```bash
cd server

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

The API server starts at **http://localhost:3001**. Interactive docs available at **http://localhost:3001/docs**.

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend starts at **http://localhost:5173**.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Create a new user account |
| `POST` | `/api/auth/login` | Login and receive JWT token |
| `POST` | `/api/upload` | Upload billing documents |
| `GET` | `/api/jobs` | List all processing jobs |
| `GET` | `/api/jobs/{id}` | Get job details with documents |
| `POST` | `/api/jobs/{id}/ocr` | Run OCR on job documents |
| `POST` | `/api/jobs/{id}/extract` | Extract key-value fields |
| `POST` | `/api/jobs/{id}/export` | Generate Excel report |
| `GET` | `/api/jobs/{id}/download` | Download Excel file |
| `GET` | `/api/documents/{job}/{doc}/preview` | Preview document image |
| `POST` | `/api/jobs/{id}/retry` | Reset failed job |
| `DELETE` | `/api/jobs/{id}` | Delete a job |
| `GET` | `/api/health` | Health check |

All endpoints (except auth and health) require `Authorization: Bearer <token>` header.

---

## Supported Fields

The extraction engine detects and parses the following billing fields:

| Field | Description |
|-------|-------------|
| Invoice Number | Invoice/receipt reference ID |
| Invoice Date | Date of issue |
| Due Date | Payment due date |
| Total Amount | Grand total / amount due |
| Subtotal | Pre-tax subtotal |
| Tax Amount | Tax/GST/VAT amount |
| Vendor Name | Issuing company name |
| Customer Name | Bill-to / recipient name |
| Payment Terms | NET 30, due on receipt, etc. |
| Currency | Detected currency symbol/code |
| PO Number | Purchase order reference |
| Address | Billing/shipping address |

---

## Workflow

```
Upload Documents → Run OCR → Select Fields → Extract Data → Export to Excel
```

1. **Upload** — Drop PDF/image billing documents
2. **OCR** — EasyOCR extracts raw text from each document
3. **Field Selection** — Choose which billing fields to extract (auto-detected fields are pre-selected)
4. **Extraction** — AI engine parses key-value pairs with confidence scores
5. **Export** — Download a styled Excel spreadsheet with all extracted data

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | Hardcoded in `auth.py` | JWT signing key (change for production) |
| Server Port | `3001` | Backend API port |
| Client Port | `5173` | Frontend dev server port |
| Database | `billscan.db` | SQLite database file |

> **Production Note:** Move `SECRET_KEY` to an environment variable before deploying.

---

## License

This project is for educational and internal use. See individual dependency licenses for third-party terms.
