from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.db.database import get_connection, initialize_database
from app.services.conversion_service import ConversionService

app = FastAPI(title="Currency Converter API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR", "AUD"]
TRAVEL_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR"]
service = ConversionService()


class ConversionRequest(BaseModel):
    base_currency: str = Field(min_length=3, max_length=3)
    target_currency: str = Field(min_length=3, max_length=3)
    amount: float = Field(gt=0)


class FavoriteRequest(BaseModel):
    source_currency: str = Field(min_length=3, max_length=3)
    target_currency: str = Field(min_length=3, max_length=3)


class TravelBudgetRequest(BaseModel):
    base_currency: str = Field(min_length=3, max_length=3)
    amount: float = Field(gt=0)


@app.on_event("startup")
def on_startup() -> None:
    initialize_database()


def validate_currency(currency: str) -> str:
    normalized = currency.upper()
    if normalized not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency: {normalized}")
    return normalized


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/currencies")
def currencies() -> dict:
    return {"currencies": SUPPORTED_CURRENCIES}


@app.post("/api/convert")
async def convert(request: ConversionRequest) -> dict:
    base = validate_currency(request.base_currency)
    target = validate_currency(request.target_currency)
    try:
        return await service.convert(base, target, request.amount)
    except (ValueError, KeyError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.post("/api/travel-budget")
async def travel_budget(request: TravelBudgetRequest) -> dict:
    base = validate_currency(request.base_currency)
    targets = [currency for currency in TRAVEL_CURRENCIES if currency != base]
    try:
        return {"base_currency": base, "amount": request.amount, "results": await service.travel_budget(base, request.amount, targets)}
    except (ValueError, KeyError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.get("/api/trends")
async def trends(base: str, target: str, days: int = 30) -> dict:
    if days < 2 or days > 30:
        raise HTTPException(status_code=400, detail="Trend range must be between 2 and 30 days")
    base_currency = validate_currency(base)
    target_currency = validate_currency(target)
    try:
        return {"base_currency": base_currency, "target_currency": target_currency, "days": days, "rates": await service.get_trend(base_currency, target_currency, days)}
    except (ValueError, KeyError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.get("/api/history")
def history(limit: int = 10) -> dict:
    if limit < 1 or limit > 50:
        raise HTTPException(status_code=400, detail="History limit must be between 1 and 50")
    return {"history": service.get_history(limit)}


@app.get("/api/favorites")
def list_favorites() -> dict:
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM favorites ORDER BY created_at DESC").fetchall()
    return {"favorites": [dict(row) for row in rows]}


@app.post("/api/favorites")
def add_favorite(request: FavoriteRequest) -> dict:
    source = validate_currency(request.source_currency)
    target = validate_currency(request.target_currency)
    if source == target:
        raise HTTPException(status_code=400, detail="Favorite currencies must be different")
    with get_connection() as connection:
        connection.execute(
            "INSERT OR IGNORE INTO favorites (source_currency, target_currency, created_at) VALUES (?, ?, ?)",
            (source, target, datetime.now(timezone.utc).isoformat()),
        )
    return {"source_currency": source, "target_currency": target}


@app.delete("/api/favorites/{favorite_id}")
def delete_favorite(favorite_id: int) -> dict:
    with get_connection() as connection:
        connection.execute("DELETE FROM favorites WHERE id = ?", (favorite_id,))
    return {"deleted": favorite_id}
