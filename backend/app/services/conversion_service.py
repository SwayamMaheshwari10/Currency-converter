from datetime import date, datetime, timedelta, timezone

from app.db.database import get_connection
from app.providers.exchange_rate_provider import ExchangeRateProvider

CACHE_TTL = timedelta(hours=1)


class ConversionService:
    def __init__(self, provider: ExchangeRateProvider | None = None) -> None:
        self.provider = provider or ExchangeRateProvider()

    async def get_rate(self, base_currency: str, target_currency: str) -> float:
        base_currency = base_currency.upper()
        target_currency = target_currency.upper()
        with get_connection() as connection:
            cached = connection.execute(
                "SELECT rate, fetched_at FROM rate_cache WHERE base_currency = ? AND target_currency = ?",
                (base_currency, target_currency),
            ).fetchone()
        if cached:
            fetched_at = datetime.fromisoformat(cached["fetched_at"])
            if datetime.now(timezone.utc) - fetched_at < CACHE_TTL:
                return float(cached["rate"])

        rate = await self.provider.get_rate(base_currency, target_currency)
        with get_connection() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO rate_cache VALUES (?, ?, ?, ?)",
                (base_currency, target_currency, rate, self.provider.now()),
            )
        return rate

    async def convert(self, base_currency: str, target_currency: str, amount: float) -> dict:
        rate = await self.get_rate(base_currency, target_currency)
        converted_amount = round(amount * rate, 2)
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO conversion_history (source_currency, target_currency, amount, converted_amount, rate, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (base_currency, target_currency, amount, converted_amount, rate, self.provider.now()),
            )
        return {
            "base_currency": base_currency,
            "target_currency": target_currency,
            "amount": amount,
            "rate": rate,
            "converted_amount": converted_amount,
        }

    async def travel_budget(self, base_currency: str, amount: float, targets: list[str]) -> list[dict]:
        results = []
        for target in targets:
            rate = await self.get_rate(base_currency, target)
            results.append({"currency": target, "amount": round(amount * rate, 2), "rate": rate})
        return results

    async def get_trend(self, base_currency: str, target_currency: str, days: int = 30) -> list[dict]:
        today = date.today()
        first_day = today - timedelta(days=days - 1)
        trend = []
        with get_connection() as connection:
            cached_rows = connection.execute(
                "SELECT rate_date, rate FROM historical_rates WHERE base_currency = ? AND target_currency = ? AND rate_date >= ? ORDER BY rate_date",
                (base_currency, target_currency, first_day.isoformat()),
            ).fetchall()
        cached = {row["rate_date"]: float(row["rate"]) for row in cached_rows}
        for offset in range(days):
            rate_date = first_day + timedelta(days=offset)
            key = rate_date.isoformat()
            rate = cached.get(key)
            if rate is None:
                rate = await self.provider.get_historical_rate(base_currency, target_currency, rate_date)
                with get_connection() as connection:
                    connection.execute(
                        "INSERT OR REPLACE INTO historical_rates VALUES (?, ?, ?, ?, ?)",
                        (base_currency, target_currency, key, rate, self.provider.now()),
                    )
            trend.append({"date": key, "rate": rate})
        return trend

    def get_history(self, limit: int = 10) -> list[dict]:
        with get_connection() as connection:
            rows = connection.execute(
                "SELECT id, source_currency, target_currency, amount, converted_amount, rate, created_at FROM conversion_history ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]
