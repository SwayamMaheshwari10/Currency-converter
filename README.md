# Rateform

A modular currency converter with live exchange rates, SQLite caching, favorites, and a Travel Budgeting mode.

## Current phase

Phase one includes:

- Standard currency conversion
- SQLite-backed rate caching with a one-hour TTL
- Favorites persistence
- Travel Budgeting comparisons across major currencies
- Responsive React interface
- Local fallback rates for development without an API key

Historical 30-day trends and conversion history UI are planned for phase two.

## Stack

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, Python
- Persistence: SQLite
- Provider: ExchangeRate API, isolated behind a backend adapter

## Run locally

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Set `EXCHANGE_RATE_API_KEY` in `.env` for live provider data. Without a key, the development fallback rates are used.

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000`. Override it with `VITE_API_URL` when needed.

## API overview

- `GET /api/health`
- `GET /api/currencies`
- `POST /api/convert`
- `POST /api/travel-budget`
- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites/{id}`

## Project structure

```text
frontend/   React UI and API client
backend/    FastAPI routes, services, provider adapter, and SQLite database
```

The frontend only talks to the backend API. Provider credentials and persistence stay server-side, which keeps the system easier to test and debug.
