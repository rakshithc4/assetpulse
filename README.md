# AssetPulse

[![CI](https://github.com/OWNER/assetpulse/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/assetpulse/actions/workflows/ci.yml)

> 🧑 Replace `OWNER` above with your actual GitHub username/org once the repo is pushed.

Asset maintenance control room modeled on SAP Plant Maintenance, built for the Perth/Sydney mining sector. SAP RAP business objects on BTP ABAP Environment (system of record) + a dark-first Next.js control room + a Python FastAPI analytics service.

**Live demo:** _add your Vercel URL here after Task 6.4_
**Case study:** [docs/CASE_STUDY.md](docs/CASE_STUDY.md) · **Demo script:** [docs/DEMO.md](docs/DEMO.md)

## Run it in under 10 minutes (mock mode, no SAP account needed)

```bash
git clone <this repo>
cd assetpulse/web
pnpm install
MOCK_MODE=1 NEXT_PUBLIC_MOCK_MODE=1 pnpm dev
```

Open `http://localhost:3000`, pick any of the three persona cards (Engineer / Supervisor / Technician), and walk the fault → convert → schedule → start → complete lifecycle against realistic in-browser mock data (`web/src/mocks/fixtures.ts`).

## What this demonstrates

| Feature | SAP consulting competency |
|---|---|
| 3 RAP managed business objects, `strict(2)`, EML-only | RAP managed programming model |
| CDS interface + projection views, associations, metadata extensions | CDS view modeling, Fiori Elements annotations |
| 6 actions, determinations, validations, instance feature control | Business object lifecycle/status-machine design |
| Cross-BO EML (StartWork/CompleteWork touching equipment) | Cross-BO transactional logic in RAP |
| OData v4 service binding, CSRF-aware server proxy | OData v4 integration patterns |
| abapGit-linked package, Z-namespace only | Clean Core, source-controlled ABAP delivery |
| Separate FastAPI analytics service, 5-min cache, fixture mock mode | Integration architecture, resilient design |

## Architecture

```
Browser (dark control-room UI)
  └─ Next.js on Vercel
       ├─ /api/sap/[...path]     → server proxy (basic auth + CSRF + cookies) → SAP BTP OData v4
       └─ /api/insights/[...]    → proxies FastAPI analytics service
SAP BTP ABAP Environment: OData v4 ← RAP managed BOs ← CDS ← HANA (3 tables)
FastAPI on Render: httpx → SAP OData → KPI aggregation → JSON (5-min cache; fixture mock mode)
```

## Repo layout

- `abap/` — ABAP source (ddic/cds/behavior/test/service), abapGit-linked to package `ZASSET_MAINT`. See `abap/MANIFEST.md` for creation order.
- `web/` — Next.js 14+ App Router, TS strict, Tailwind (tokens from `design/tokens.json`), shadcn/ui, TanStack Query, NextAuth, zod, MSW, Vitest, Playwright.
- `analytics/` — FastAPI + httpx; `MOCK_MODE=1` serves fixtures; pytest with exact expected KPI values.
- `design/` — design tokens and screens.
- `docs/` — ADRs (`docs/adr/`), `REDEPLOY.md`, `CASE_STUDY.md`, `DEMO.md`, `V2_BACKLOG.md`.

## Commands

```
web/:        pnpm dev | lint | typecheck | test | e2e | e2e:live
analytics/:  uvicorn app.main:app --reload | pytest | MOCK_MODE=1 uvicorn ...
scripts:     node web/scripts/sap-smoke.mjs | node web/scripts/seed.mjs
```

## Architecture decisions

See `docs/adr/`: 0001 RAP managed over unmanaged · 0002 server-side proxy for SAP auth · 0003 separate FastAPI analytics service · 0004 dark-first design direction · 0005 abapGit source-of-truth strategy.

## Out of scope (v1)

Email/push notifications, attachments, preventive-maintenance rules, multi-level approvals, real SAP authorization objects, offline mode, light theme, i18n — see `docs/V2_BACKLOG.md`.
