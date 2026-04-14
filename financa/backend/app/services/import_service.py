"""
OFX and CSV import service.

Supports: Itaú OFX, Nubank CSV, Inter CSV, BB OFX/CSV.
Returns a list of dicts ready for TransactionCreate.

Design choice: Use ofxparse for OFX (stable, well-maintained).
CSV parsing is hand-rolled for bank-specific column layouts.
"""
import csv
import io
import re
import uuid
from datetime import date, datetime
from typing import Any

import ofxparse


_BANK_DETECT: dict[str, list[str]] = {
    "itau": ["itau", "itaú", "banco itau"],
    "nubank": ["nubank", "nu pagamentos"],
    "inter": ["inter", "banco inter"],
    "bb": ["banco do brasil", "bb ", "bradescobanking"],
}


def _detect_bank(header_text: str) -> str:
    """Heuristic bank detection from OFX FI or CSV headers."""
    lower = header_text.lower()
    for bank, hints in _BANK_DETECT.items():
        if any(h in lower for h in hints):
            return bank
    return "unknown"


def _parse_date(s: str) -> date:
    """Parse YYYYMMDD or DD/MM/YYYY date strings."""
    s = s.strip()
    if re.match(r"^\d{8}$", s):
        return datetime.strptime(s, "%Y%m%d").date()
    if re.match(r"^\d{2}/\d{2}/\d{4}$", s):
        return datetime.strptime(s, "%d/%m/%Y").date()
    if re.match(r"^\d{4}-\d{2}-\d{2}", s):
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    raise ValueError(f"Unknown date format: {s!r}")


def _brl_cents(s: str) -> int:
    """Parse Brazilian currency string to cents. E.g. '-1.234,56' → -123456."""
    s = s.strip().replace("R$", "").replace(" ", "")
    negative = s.startswith("-")
    s = s.lstrip("-+")
    # Remove thousands separator (dot) and replace decimal comma with dot
    s = s.replace(".", "").replace(",", ".")
    cents = round(float(s) * 100)
    return -cents if negative else cents


def parse_ofx(content: bytes) -> list[dict[str, Any]]:
    """Parse OFX file (Itaú or BB format) into transaction dicts."""
    ofx = ofxparse.OfxParser.parse(io.BytesIO(content))
    rows: list[dict[str, Any]] = []

    for account in ofx.accounts:
        for txn in account.statement.transactions:
            amount_raw: float = float(txn.amount)
            amount_cents = round(abs(amount_raw) * 100)
            tx_type = "income" if amount_raw > 0 else "expense"
            rows.append({
                "id": str(uuid.uuid4()),
                "amount_cents": amount_cents,
                "type": tx_type,
                "description": (txn.memo or txn.payee or "").strip()[:200],
                "date": txn.date.date() if hasattr(txn.date, "date") else txn.date,
                "notes": f"OFX ID: {txn.id}",
                "is_reconciled": True,
                "account_id": None,   # caller must assign
                "category_id": None,
            })

    return rows


def parse_nubank_csv(content: bytes) -> list[dict[str, Any]]:
    """
    Parse Nubank credit card CSV export.
    Columns: date,category,title,amount
    """
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict[str, Any]] = []

    for row in reader:
        date_str = row.get("date") or row.get("Data") or ""
        title = row.get("title") or row.get("Descrição") or ""
        amount_str = row.get("amount") or row.get("Valor") or "0"

        amount_cents = _brl_cents(amount_str)
        tx_type = "income" if amount_cents > 0 else "expense"

        rows.append({
            "id": str(uuid.uuid4()),
            "amount_cents": abs(amount_cents),
            "type": tx_type,
            "description": title.strip()[:200],
            "date": _parse_date(date_str),
            "notes": None,
            "is_reconciled": True,
            "account_id": None,
            "category_id": None,
        })

    return rows


def parse_inter_csv(content: bytes) -> list[dict[str, Any]]:
    """
    Parse Banco Inter account statement CSV.
    Columns: Data Lançamento,Histórico,Descrição,Valor,Saldo
    """
    text = content.decode("utf-8-sig")
    # Inter uses semicolons
    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    rows: list[dict[str, Any]] = []

    for row in reader:
        date_str = row.get("Data Lançamento") or row.get("Data") or ""
        descricao = (row.get("Descrição") or row.get("Historico") or "").strip()
        amount_str = row.get("Valor") or "0"

        try:
            amount_cents = _brl_cents(amount_str)
        except ValueError:
            continue

        tx_type = "income" if amount_cents > 0 else "expense"

        rows.append({
            "id": str(uuid.uuid4()),
            "amount_cents": abs(amount_cents),
            "type": tx_type,
            "description": descricao[:200],
            "date": _parse_date(date_str),
            "notes": None,
            "is_reconciled": True,
            "account_id": None,
            "category_id": None,
        })

    return rows


def parse_bb_csv(content: bytes) -> list[dict[str, Any]]:
    """
    Parse Banco do Brasil account statement CSV.
    Columns: Data,Histórico,Nro.Docto.,Valor,Saldo do Período
    """
    text = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    rows: list[dict[str, Any]] = []

    for row in reader:
        date_str = row.get("Data") or ""
        hist = (row.get("Histórico") or row.get("Historico") or "").strip()
        amount_str = row.get("Valor") or "0"

        try:
            amount_cents = _brl_cents(amount_str)
        except ValueError:
            continue

        if not date_str.strip():
            continue

        tx_type = "income" if amount_cents > 0 else "expense"

        rows.append({
            "id": str(uuid.uuid4()),
            "amount_cents": abs(amount_cents),
            "type": tx_type,
            "description": hist[:200],
            "date": _parse_date(date_str),
            "notes": None,
            "is_reconciled": True,
            "account_id": None,
            "category_id": None,
        })

    return rows


def parse_file(
    content: bytes, filename: str, account_id: str
) -> list[dict[str, Any]]:
    """
    Auto-detect format from filename extension and content, parse, inject account_id.

    Args:
        content: Raw file bytes.
        filename: Original filename (used for format detection).
        account_id: UUID of the account to assign transactions to.

    Returns:
        List of transaction dicts ready for bulk insert.
    """
    lower = filename.lower()
    rows: list[dict[str, Any]]

    if lower.endswith(".ofx") or lower.endswith(".qfx"):
        rows = parse_ofx(content)
    elif lower.endswith(".csv"):
        # Detect bank from first 512 bytes
        header_sample = content[:512].decode("utf-8-sig", errors="ignore")
        bank = _detect_bank(header_sample)
        if bank == "nubank":
            rows = parse_nubank_csv(content)
        elif bank == "inter":
            rows = parse_inter_csv(content)
        elif bank in ("bb", "banco do brasil"):
            rows = parse_bb_csv(content)
        else:
            # Default: try Nubank layout first, fall back to Inter
            try:
                rows = parse_nubank_csv(content)
            except Exception:
                rows = parse_inter_csv(content)
    else:
        raise ValueError(f"Unsupported file format: {filename!r}")

    for row in rows:
        row["account_id"] = account_id

    return rows
