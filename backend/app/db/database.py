from pathlib import Path
import sqlite3

DATABASE_PATH = Path(__file__).resolve().parents[2] / "currency_converter.db"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS rate_cache (
                base_currency TEXT NOT NULL,
                target_currency TEXT NOT NULL,
                rate REAL NOT NULL,
                fetched_at TEXT NOT NULL,
                PRIMARY KEY (base_currency, target_currency)
            );
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_currency TEXT NOT NULL,
                target_currency TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(source_currency, target_currency)
            );
            CREATE TABLE IF NOT EXISTS conversion_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_currency TEXT NOT NULL,
                target_currency TEXT NOT NULL,
                amount REAL NOT NULL,
                converted_amount REAL NOT NULL,
                rate REAL NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
