# Rateform

A modular currency converter with live exchange rates, SQLite caching, favorites, and a Travel Budgeting mode.

## Features

- Standard currency conversion
- SQLite-backed rate caching with a one-hour TTL
- Favorites persistence
- Travel Budgeting comparisons across major currencies
- Responsive React interface
- Local fallback rates for development without an API key
- 30-day historical trend chart
- Recent conversion history

## Stack

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, Python
- Persistence: SQLite
- Provider: ExchangeRate API, isolated behind a backend adapter

## Run locally

### Backend

```powershell
cd "C:\path\to\currency-converter"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd backend
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Set `EXCHANGE_RATE_API_KEY` in `.env` for live provider data. Without a key, the development fallback rates are used.
Set `ALLOWED_ORIGINS` to a comma-separated list when the frontend is hosted outside `http://localhost:5173`.

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
- `GET /api/trends?base=USD&target=EUR&days=30`
- `GET /api/history?limit=8`
- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites/{id}`

## Project structure

```text
README.md                                   Project overview, setup, API, and structure guide
requirements.txt                            Backend Python dependencies
.gitignore                                  Local environment and generated-file exclusions

backend/
  .env.example                              Backend configuration template
  app/
    main.py                                 FastAPI app, routes, validation, and CORS
    db/database.py                          SQLite connection and schema initialization
    providers/exchange_rate_provider.py     Live provider adapter and development fallback rates
    services/conversion_service.py          Caching, conversion, trend, and history business logic
  tests/                                    Backend test location

frontend/
  package.json                              Frontend scripts and npm dependencies
  package-lock.json                         Reproducible frontend dependency versions
  index.html                                Browser document shell and application title
  src/
    main.tsx                                React entry point
    App.tsx                                 Converter, travel budget, chart, favorites, and history UI
    api.ts                                  Typed frontend-to-backend API client
    App.css                                 Application layout and responsive styling
    index.css                               Global stylesheet entry
  public/                                   Static browser assets
  vite.config.ts                            Vite build configuration
```

The frontend only talks to the backend API. Provider credentials and persistence stay server-side, which keeps the system easier to test and debug.