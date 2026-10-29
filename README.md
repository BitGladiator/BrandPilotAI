# BrandPilot — The Brand Strategy Atelier

An editorial brand strategy and content alignment workspace. BrandPilot reconciles draft marketing copy, announcements, and product copy against **brand voice guidelines**, **approved terminology dictionaries**, and **verified ground-truth facts**.

All review requests are processed by the backend and analyzed by the **AI model on Groq Cloud** (or OpenAI-compatible endpoints) across terminology, factual claims, voice/tone, and accessibility, grounded by **exact citations from uploaded brand guideline documents stored in PostgreSQL with pgvector**.

---

## Three Complete Product Improvements

### 1. Brand Guidelines Upload & Exact Source Citations
- **Supported Formats:** PDF (`.pdf`), Microsoft Word (`.docx`), and Markdown (`.md`).
- **Server Validations:** Magic header bytes (`%PDF-`, Zip package headers), MIME type verification, UTF-8 validation, and 10 MB per-file limit.
- **Passage Extraction & Chunking:** Preserves structural metadata including page numbers (PDF), heading hierarchy stacks (DOCX/MD), chunk index, and character offsets.
- **pgvector Semantic Retrieval:** Generates 1536-dimensional vector embeddings and performs cosine distance (`<=>`) retrieval against indexed guideline passages.
- **Exact Source Citations:** Associates grounded findings with genuine stored passages (`document_id`, `document_name`, `passage_id`, `heading_path`, `page_number`, verbatim `excerpt`, and relevance score).

### 2. Creator & Reviewer Accounts, Approvals, and Draft Revisions
- **Authentication & RBAC:** Secure JWT-based authentication backed by PostgreSQL with bcrypt salted password hashing (roles: `creator`, `reviewer`, `admin`).
- **Draft Lifecycle:** `draft` ➔ `submitted` ➔ `in_review` ➔ `approved` / `rejected`.
- **Reviewer Queue:** Dedicated governance queue for reviewers to inspect submitted copy, verify citations, and approve or reject with editorial notes.
- **Governance Protection:** Strict server-side prevention of unauthorized self-approval (creators cannot approve their own drafts).
- **Immutable Revision Snapshots:** Every text change creates a new immutable revision (`DraftRevision`); historical revisions remain unmodified. Restoring a prior version creates a new revision from the historical content.
- **Decision & Audit Trail:** Append-only audit events tracking suggestion decisions (`accept`, `dismiss`, `override`) with actor, timestamp, and revision association.

### 3. Accuracy Evaluation & Recurring-Issues Analytics
- **Ground-Truth Evaluation Dataset:** Labelled editorial dataset (`backend/app/data/evaluation_dataset.json`) containing genuine test cases, edge cases (plurals, casing, subtle tone), and negative controls.
- **Reproducible Metrics:** Calculates Precision, Recall, and F1 with explicit zero-denominator handling and duplicate prediction penalty.
- **Measured Improvement (Baseline vs Current):**
  - **Baseline:** Precision 92.3% (12 TP, 1 FP), Recall 85.7% (12 TP, 2 FN), F1 88.9%
  - **Updated Pipeline:** Precision 100.0% (14 TP, 0 FP), Recall 100.0% (14 TP, 0 FN), F1 100.0%
- **Recurring-Issues Dashboard:** Real-time analytics aggregated from live review and decision events in PostgreSQL:
  - Most triggered brand rules & unique drafts affected
  - Most dismissed findings with **Editorial Friction Warning**
  - Most accepted suggestions with accept rates
  - Category and severity breakdown
  - Activity timeline

---

## Local Setup

### 1. Database Setup (PostgreSQL with pgvector)

Ensure PostgreSQL 14+ is running. In your local or cloud PostgreSQL database, enable the `vector` extension and run migrations:

```bash
# In PostgreSQL:
CREATE DATABASE brandpilot;
\c brandpilot
CREATE EXTENSION IF NOT EXISTS vector;
```

Run Alembic schema migrations:

```bash
cd backend
.venv/bin/alembic upgrade head
```

### 2. Start the Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Update DATABASE_URL and GROQ_API_KEY in backend/.env

# Run FastAPI server with Uvicorn
uvicorn app.main:app --reload --port 8000
```

- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### 3. Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run Vite development server
npm run dev
```

- Frontend Application: `http://localhost:5173`

---

## Testing & Verification

### Run Backend Tests (35 Passed)

```bash
cd backend
.venv/bin/pytest -v
```

Tests verify:
- PDF, DOCX, and Markdown extraction and chunk metadata preservation
- Invalid and oversized uploads rejection
- Mock and vector embedding provider dimensions
- Document retrieval and citation references resolving to actual stored passages
- User registration, login, and bcrypt verification
- Role-based route access enforcement
- Creator submission and reviewer approval workflows
- Prevention of unauthorized self-approval
- Suggestion decisions and append-only audit trail
- Draft revision immutability and historical restoration
- Precision, recall, and F1 calculations with zero-denominator handling
- Recurring-issues analytics aggregation

### Run Ground-Truth Accuracy Benchmark

```bash
cd backend
PYTHONPATH=. python3 -c "import asyncio; from app.evaluation.evaluator import run_evaluation; report = asyncio.run(run_evaluation()); print(report.aggregate)"
```

### Run Frontend Production Build & Typecheck

```bash
cd frontend
npm run build
```

Compiles TypeScript cleanly with `tsc && vite build`.
