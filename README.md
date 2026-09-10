# NoticeLens

**NoticeLens turns noisy real-world text into a practical decision card.**

Paste an email, bill, school circular, warranty notice, service message, or suspicious text. NoticeLens locally extracts:

- **Priority** — LOW / MEDIUM / HIGH
- **Plain-language summary**
- **Concrete actions**
- **Dates and deadlines**
- **Money amounts**
- **Email addresses and phone numbers**
- **Safety warnings** for common social-engineering signals
- **Explainability signals** showing why the item was flagged

## Why this project exists

People receive information faster than they can process it. The problem is not another place to store tasks; it is understanding **what deserves attention right now**.

NoticeLens is intentionally a small, auditable reference implementation. It uses deterministic Python rules rather than an external AI API, so the demo works without API keys and sensitive text can stay on the user's machine.

> **Important:** This is an educational information-triage tool, not a legal, financial, medical, or cybersecurity authority. Always verify important claims with the original source.

## Run locally

Python 3.10+ is recommended.

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start:

```bash
python app.py
```

Open the local address printed by Flask.

## Test

```bash
pytest
```

## Architecture

```text
Browser
   │
   ├── textarea
   │
   ▼
POST /api/analyze
   │
   ▼
analyzer.py
   ├── date extraction
   ├── money extraction
   ├── action extraction
   ├── contact extraction
   ├── safety signals
   └── explainable priority score
   │
   ▼
JSON decision card
   │
   ▼
Browser UI
```

## Roadmap

The current version is deliberately dependency-light. Strong next steps:

1. Add multilingual extraction.
2. Add a browser extension for "Sift this page".
3. Add OCR for screenshots and photographed notices.
4. Add user-editable rule packs.
5. Add a local SQLite history with encryption.
6. Add calendar export for detected dates.
7. Add a benchmark dataset and precision/recall measurements.
8. Add optional local LLM support while keeping cloud APIs opt-in.

## Project philosophy

**Useful beats flashy. Explainable beats magical. Private by default beats data-hungry.**

Built as an open-source portfolio project.
