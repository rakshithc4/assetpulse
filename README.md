# AssetPulse

[![CI](https://github.com/rakshithc4/assetpulse/actions/workflows/ci.yml/badge.svg)](https://github.com/rakshithc4/assetpulse/actions/workflows/ci.yml)

Asset maintenance control room modeled on SAP Plant Maintenance, built for the Perth/Sydney mining sector. SAP RAP business objects on BTP ABAP Environment (system of record) + a dark-first Next.js control room + a Python FastAPI analytics service.

**Live demo:** https://assetpulse-psi.vercel.app (runs on built-in sample data; pick any persona card) · **Analytics API:** https://assetpulse-analytics.onrender.com/docs (free tier: the first request after idle can take about a minute)

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

- `abap/` — ABAP source serialized by abapGit (FULL folder logic, one file set per object, starting folder set in `.abapgit.xml` at the repo root), linked to package `ZASSET_MAINT`. See `abap/MANIFEST.md` for the object list.
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

## Deployment

The hosted demo runs in mock mode: the Next.js app (Vercel) uses built-in sample data, and the FastAPI analytics service (Render, free tier) serves fixture-based KPIs. The RAP backend was built and verified on SAP BTP ABAP Environment (shared trial) in ADT: ABAP Unit 12/12 passing and ATC with 0 errors. The shared trial has no Communication Management apps, so the hosted demo isn't connected to the live OData service; `docs/REDEPLOY.md` covers wiring it to a system that has them.

## Out of scope (v1)

Email/push notifications, attachments, preventive-maintenance rules, multi-level approvals, real SAP authorization objects, offline mode, light theme, i18n — see `docs/V2_BACKLOG.md`.
