# AssetPulse

![Architecture](docs/assetpulse-architecture.png)

[![CI](https://github.com/rakshithc4/assetpulse/actions/workflows/ci.yml/badge.svg)](https://github.com/rakshithc4/assetpulse/actions/workflows/ci.yml)

Asset maintenance control room modeled on SAP Plant Maintenance, built for the Perth/Sydney mining sector: three SAP RAP business objects on BTP ABAP Environment, a dark-first Next.js control room, and a Python FastAPI analytics service.

**Live demo:** https://assetpulse-psi.vercel.app (runs on built-in sample data; pick any persona card) · **Analytics API:** https://assetpulse-analytics.onrender.com/docs (free tier: the first request after idle can take about a minute) · **Case study:** [docs/CASE_STUDY.md](docs/CASE_STUDY.md)

## Demo video

<!-- Paste the walkthrough URL here once it's recorded. -->
A 2–3 minute walkthrough is coming soon: _link to be added_. It follows the script in [docs/DEMO.md](docs/DEMO.md).

## How the demo works

The hosted demo runs entirely on **built-in sample data**. It is not connected to a SAP system, and a banner on every page says so.

- **Frontend:** an in-browser mock layer ([MSW](https://mswjs.io)) answers the app's API calls and keeps state in memory. Every action works (report a fault, convert, schedule, start, complete, with the equipment status flipping), but nothing is saved and a refresh resets it.
- **Analytics:** the FastAPI service on Render is deployed and serves fixture-based KPIs (see the API docs link above). The hosted UI's Insights charts are served by the same in-browser sample data. When the service is used (mock mode off), the UI shows "Waking analytics service…" through Render's cold start and falls back to sample data if it doesn't answer in time, then swaps in live figures once it does.
- **SAP backend:** the three RAP business objects were built and verified on SAP BTP ABAP Environment (shared trial) in ADT: ABAP Unit 12/12 passing and ATC with 0 errors. The 12 test methods are in [`abap/ztc_assetpulse.clas.abap`](abap/ztc_assetpulse.clas.abap), and all ABAP source is serialized into `abap/` by abapGit. The shared trial has no Communication Management apps, so the hosted demo isn't connected to the live OData service. [`docs/REDEPLOY.md`](docs/REDEPLOY.md) covers rebuilding the SAP side.

## Run it locally (mock mode, no SAP account needed)

Needs Node 22.13+ and pnpm 11 (the exact version is pinned in `web/package.json`).

```bash
git clone https://github.com/rakshithc4/assetpulse.git
cd assetpulse/web
pnpm install
NEXTAUTH_SECRET=local-dev-only NEXTAUTH_URL=http://localhost:3000 \
MOCK_MODE=1 NEXT_PUBLIC_MOCK_MODE=1 pnpm dev
```

Open `http://localhost:3000`, pick any of the three persona cards (Engineer / Supervisor / Technician), and walk the fault → convert → schedule → start → complete lifecycle against sample data (`web/src/mocks/fixtures.ts`).

`NEXTAUTH_SECRET` can be any string locally. Without it, sign-in silently bounces back to the login page.

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

The full design. The hosted demo replaces the SAP link with the in-browser sample data described above.

```
Browser (dark control-room UI)
  └─ Next.js on Vercel
       ├─ /api/sap/[...path]     → server proxy (basic auth + CSRF + cookies) → SAP BTP OData v4
       └─ /api/insights/[...]    → proxies FastAPI analytics service
SAP BTP ABAP Environment: OData v4 ← RAP managed BOs ← CDS ← HANA (3 tables)
FastAPI on Render: httpx → SAP OData → KPI aggregation → JSON (5-min cache; fixture mock mode)
```

More detail in [ARCHITECTURE.md](ARCHITECTURE.md).

## Repo layout

- `abap/` — ABAP source serialized by abapGit (FULL folder logic, one file set per object, starting folder set in `.abapgit.xml` at the repo root), linked to package `ZASSET_MAINT`. See `abap/MANIFEST.md` for the object list.
- `web/` — Next.js 14+ App Router, TS strict, Tailwind (tokens from `design/tokens.json`), shadcn/ui, TanStack Query, NextAuth, zod, MSW, Vitest, Playwright.
- `analytics/` — FastAPI + httpx; `MOCK_MODE=1` serves fixtures; pytest with exact expected KPI values.
- `design/` — design tokens.
- `docs/` — ADRs ([`docs/adr/`](docs/adr)), [`REDEPLOY.md`](docs/REDEPLOY.md), [`CASE_STUDY.md`](docs/CASE_STUDY.md), [`DEMO.md`](docs/DEMO.md), [`V2_BACKLOG.md`](docs/V2_BACKLOG.md), and [`planning/`](docs/planning) (the original kickoff and design brief).

## Commands

```
web/:        pnpm dev | lint | typecheck | test | e2e | e2e:live
analytics/:  uvicorn app.main:app --reload | pytest | MOCK_MODE=1 uvicorn ...
```

These two need a SAP-connected deployment (not the hosted demo):

```
node --env-file=.env web/scripts/sap-smoke.mjs                  # from the repo root; .env needs the SAP_* values
WEB_BASE_URL=http://localhost:3000 node web/scripts/seed.mjs    # seeds through a running, SAP-connected app
```

## Architecture decisions

See `docs/adr/`: 0001 RAP managed over unmanaged · 0002 server-side proxy for SAP auth · 0003 separate FastAPI analytics service · 0004 dark-first design direction · 0005 abapGit source-of-truth strategy.

## Out of scope (v1)

Email/push notifications, attachments, preventive-maintenance rules, multi-level approvals, real SAP authorization objects, offline mode, light theme, i18n — see `docs/V2_BACKLOG.md`.
