# BrandPilot — The Brand Strategy Atelier

An editorial brand strategy and content alignment workspace. BrandPilot reconciles draft marketing copy, announcements, and product copy against **brand voice guidelines**, **approved terminology dictionaries**, and **verified ground-truth facts**.

All review requests from the frontend are processed by the backend and analyzed by the **AI model on Groq Cloud** (or OpenAI-compatible endpoints) across terminology, factual claims, voice/tone, and accessibility.

---

## Design Identity: The Brand Strategy Atelier

BrandPilot is crafted around a warm, classic editorial aesthetic:
- **Main background:** Warm ivory (`#F7F4EF`)
- **Primary surfaces:** Pure alabaster (`#FFFEFC`)
- **Main typography:** Rich charcoal espresso (`#292421`)
- **Secondary typography:** Muted warm gray (`#706860`)
- **Borders:** Fine sand line (`#E5DED5`)
- **Primary brand color:** Deep burgundy (`#702F3D` / hover `#582330`)
- **Secondary accent:** Muted copper (`#B17A56`)
- **Soft rose accent:** `#F3E9E8`
- **Neutral info background:** `#F0ECE6`
- **Error state:** `#A43D35`

---

## Deployment Guide

### A. Deploy Backend to Render

The repository includes a ready-to-use [`render.yaml`](file:///Users/karansharma/Desktop/Projects/BrandPilotAI/render.yaml) blueprint and [`backend/Procfile`](file:///Users/karansharma/Desktop/Projects/BrandPilotAI/backend/Procfile).

1. Push your repository to **GitHub**.
2. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Web Service** (or **Blueprint**).
3. Connect your GitHub repository.
4. If setting up manually:
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. In **Environment Variables**, add:
   - `GROQ_API_KEY`: `gsk_your_actual_groq_api_key_here`
   - `AI_PROVIDER`: `groq`
   - `AI_BASE_URL`: `https://api.groq.com/openai/v1`
   - `AI_MODEL`: `openai/gpt-oss-120b`
   - `CORS_ORIGINS`: `*` (or your Vercel URL, e.g. `https://your-frontend.vercel.app`)
6. Click **Deploy**. Render will provide your backend URL (e.g. `https://brandpilot-backend.onrender.com`).

---

### B. Deploy Frontend to Vercel

The repository includes [`vercel.json`](file:///Users/karansharma/Desktop/Projects/BrandPilotAI/vercel.json) and [`frontend/vercel.json`](file:///Users/karansharma/Desktop/Projects/BrandPilotAI/frontend/vercel.json) configured for Single Page Application (SPA) routing.

1. Go to [vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Edit and select `frontend` (or keep root; both are supported).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. In **Environment Variables**, add:
   - `VITE_API_BASE_URL`: Your deployed Render backend URL (e.g. `https://brandpilot-backend.onrender.com`)
5. Click **Deploy**. Vercel will build and launch your application.

---

## Local Setup

### 1. Start the Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (add your GROQ_API_KEY)
cp .env.example .env

# Run FastAPI server with Uvicorn
uvicorn app.main:app --reload --port 8000
```

- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### 2. Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run Vite development server
npm run dev
```

- Frontend Application: `http://localhost:5173`

---

## Testing & Verification

### Run Backend Tests

```bash
cd backend
.venv/bin/pytest -v
```

Expected result: **20 passed** (health, sample data, schema validation, fact conflict detection, unsupported claims, terminology plural matching, tone heuristics, accessibility checks, AI degradation).

### Run Frontend Production Build & Typecheck

```bash
cd frontend
npm run build
```

Compiles TypeScript cleanly with `tsc && vite build`.
