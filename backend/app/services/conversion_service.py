from datetime import datetime, timedelta, timezone

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
            result = await self.convert(base_currency, target, amount)
            results.append({"currency": target, "amount": result["converted_amount"], "rate": result["rate"]})
        return results
