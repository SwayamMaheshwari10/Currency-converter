import os
from datetime import datetime, timezone

import httpx

FALLBACK_RATES = {
    "USD": {"EUR": 0.92, "GBP": 0.78, "JPY": 149.2, "INR": 83.1, "AUD": 1.53},
    "EUR": {"USD": 1.09, "GBP": 0.85, "JPY": 162.3, "INR": 90.3, "AUD": 1.66},
    "GBP": {"USD": 1.28, "EUR": 1.18, "JPY": 190.7, "INR": 106.4, "AUD": 1.96},
    "JPY": {"USD": 0.0067, "EUR": 0.0062, "GBP": 0.0052, "INR": 0.56, "AUD": 0.0103},
    "INR": {"USD": 0.012, "EUR": 0.011, "GBP": 0.0094, "JPY": 1.8, "AUD": 0.0184},
    "AUD": {"USD": 0.65, "EUR": 0.60, "GBP": 0.51, "JPY": 97.5, "INR": 54.3},
}


class ExchangeRateProvider:
    def __init__(self) -> None:
        self.api_key = os.getenv("EXCHANGE_RATE_API_KEY")

    async def get_rate(self, base_currency: str, target_currency: str) -> float:
        if base_currency == target_currency:
            return 1.0
        if self.api_key:
            url = f"https://v6.exchangerate-api.com/v6/{self.api_key}/latest/{base_currency}"
            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.get(url)
                response.raise_for_status()
                payload = response.json()
                rate = payload.get("conversion_rates", {}).get(target_currency)
                if rate is None:
                    raise ValueError("The provider did not return that currency pair")
                return float(rate)
        try:
            return FALLBACK_RATES[base_currency][target_currency]
        except KeyError as error:
            raise ValueError("Unsupported currency pair without a configured API key") from error

    @staticmethod
    def now() -> str:
        return datetime.now(timezone.utc).isoformat()
