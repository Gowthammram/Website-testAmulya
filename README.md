# Amulya: Every Life Is Priceless

A web prototype of an AI-assisted emotional-support app that helps people reach **real human support**. It is a learning prototype, **not** a replacement for professional care, and it cannot predict or prevent suicide.

## What is real, what is simulated

| Feature | Status |
|---|---|
| Onboarding, dashboard, navigation, "Need help now?" button | Implemented |
| AI chat via backend (key stays on the server) | Implemented, needs your API key |
| Rule-based safety check and fixed urgent reply | Implemented and unit-tested |
| Fallback reply when the AI is unavailable | Implemented and unit-tested |
| Personal video: record, preview, play, re-record, delete, skip (local only) | Implemented, **needs testing in your browser** |
| Trusted contact: add, edit, remove, with consent | Implemented and unit-tested |
| Safety plan | Implemented |
| Emergency screen: tap-to-call 112 and Tele-MANAS 14416 | Implemented (opens your dialer; numbers must be verified before release) |
| Emergency message to trusted contact | **Simulated.** Preview, confirm, then a test event is recorded. Nothing is sent. |
| Location sharing every 5–6 minutes | **Simulated.** Test events only, and only while the page is open. |
| Real SMS provider | **Planned** (the code has a provider interface ready) |
| Background location, accounts, encryption | **Planned** (Flutter app) |

## Verification status (honest report)

- **Backend logic: 24 automated tests passed** (safety rules, chat workflow, AI failure, notifications, validation, database, location). The API-level tests in `tests/test_api.py` were written but **not run yet**. Run them with `pytest` on your laptop.
- **Frontend: written but never compiled or opened in a browser.** Some small pure functions were checked, but the screens, camera, and location have not been tested. Expect to fix a few TypeScript or runtime errors. Send me the exact error text and I'll help you diagnose it.

## 1. Install (Windows)

VS Code, Node.js LTS, Python 3.11 or newer (tick "Add to PATH"), Git, and Chrome or Edge.

## 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\.env.example .env
```

Open `backend\.env` and put your AI key in `LLM_API_KEY`. Leave `DEMO_MODE=true`. Never share or commit `.env`. Without a key the app still works and uses simple fallback replies.

```powershell
uvicorn app.main:app --reload --port 8000
```

Check it: open http://127.0.0.1:8000/api/health. You should see `{"status":"ok","demo_mode":true,...}`. Interactive API docs: http://127.0.0.1:8000/docs

## 3. Frontend

If you already ran `npm create vite@latest frontend -- --template react-ts` earlier, keep that folder and copy these files from this project over it: `src\` (replace everything inside, and delete `App.css` and the `assets` folder) and `vite.config.ts`. Otherwise create it first with that command. Then:

```powershell
cd frontend
npm install
npm install -D vitest
npm run dev
```

Open http://localhost:5173. Use `localhost`, because browsers only allow the camera there or on https.

Optional: add `"test": "vitest run"` under `"scripts"` in `frontend/package.json`, change the `<title>` in `index.html` to `Amulya`, then run `npm test`.

## 4. Run the tests

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -v
```

Tests never call a real AI service, send a real message, or place a call. Manual test steps are in `docs/TESTING.md`.

## Project layout

```
backend/app/safety/     risk rules, fixed replies, crisis resources
backend/app/services/   llm.py, chat.py, notify.py, location.py (independent, testable)
backend/app/models/     db.py (SQLite), schemas.py (input validation)
backend/app/api/        routes.py (thin HTTP layer)
frontend/src/           pages, components, services, hooks, types
docs/                   PRIVACY.md, TESTING.md, API_AND_FLUTTER.md
```

## Before real users

Clinical review by qualified mental-health professionals, security and privacy review (including India's DPDP Act), encryption and accounts, usability testing with care, and verification of every crisis number.
