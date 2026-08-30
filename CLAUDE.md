# CLAUDE.md — AssetPulse

Repo memory for Claude Code. The binding requirements live in `docs/superpowers/specs/2026-07-16-assetpulse-design.md`. Read it before any work.

## First act in this repo — non-negotiable
No implementation exists yet by design. Your first action is:
1. Invoke `superpowers:using-git-worktrees` → branch `feat/assetpulse-v1`.
2. Invoke `superpowers:writing-plans` against the spec → produce `docs/superpowers/plans/2026-07-16-assetpulse.md` at full bite-sized granularity (failing test code, exact commands, complete code per step — the skill's No Placeholders rules apply).
3. Offer the execution choice (subagent-driven recommended) exactly as writing-plans prescribes.
Do not scaffold, code, or install anything before the plan exists and the human picks an execution mode.

## What this project is
SAP Plant Maintenance-style asset maintenance product: RAP business objects on SAP BTP (system of record), dark control-room Next.js app on Vercel, FastAPI analytics service on Render. Three entities (Equipment, MaintenanceRequest, WorkOrder), six RAP actions, cross-BO status effects. This is the owner's flagship portfolio project for SAP roles in Sydney/Perth — polish and professionalism are requirements.

## Hard rules
1. **Never fabricate SAP results.** ABAP activates only in Eclipse ADT. At every 🧑 manual checkpoint: print exact instructions, stop, wait for confirmation or pasted output. A failed checkpoint blocks the phase.
2. **No secrets in git** — `SAP_USER/SAP_PASS/SAP_BASE_URL/SAP_SERVICE_PATH/NEXTAUTH_SECRET/ANALYTICS_URL` live in `.env` (gitignored); `.env.example` has placeholders only. Check before every commit.
3. **No SAP or analytics calls from the browser.** SAP → `/api/sap/[...path]`; analytics → `/api/insights/[...]`. Anything else is a bug.
4. **TDD always** (test-driven-development skill): failing test first, every feature task, all three codebases (vitest / pytest / ABAP Unit).
5. **EML only** inside RAP behavior code; `strict(2)` everywhere; no direct `UPDATE dbtab`.
6. **Role×status logic lives only in `web/src/lib/domain.ts`** — the tested matrix. UI components consume it; they never re-derive permissions.
7. **Design tokens only** — components use Tailwind classes generated from `design/tokens.json`; no ad-hoc hex.
8. Phase gates: `requesting-code-review` then `verification-before-completion` before any phase is marked done. Finish with `finishing-a-development-branch`.

## Layout
```
abap/       ABAP source, abapGit-linked to the ADT package ZASSET_MAINT (ddic/ cds/ behavior/ test/ service/ + MANIFEST.md creation order)
web/        Next.js app (App Router, TS strict, Tailwind, shadcn/ui, TanStack Query, NextAuth, zod, MSW, Vitest, Playwright)
analytics/  FastAPI + httpx + pandas; MOCK_MODE=1 uses fixtures/ JSON; pytest
design/     Claude Design outputs: tokens.json, screens, README
docs/       superpowers/{specs,plans}/, adr/, REDEPLOY.md, CASE_STUDY.md, DEMO.md, V2_BACKLOG.md
.github/    workflows/ci.yml (web lint+typecheck+vitest+playwright-mock; analytics ruff+pytest)
```

## Conventions
- ABAP: Z-namespace; tables ZEQUIPMENT/ZMAINT_REQ/ZWORK_ORDER; ZI_/ZC_ views; ZBP_ behavior pools; ZA_ abstract entities; ZTC_ tests; statuses are UPPERCASE strings exactly as in the spec §3.
- TypeScript strict, no `any`; conventional commits referencing plan task IDs.
- Python: ruff-clean, type-hinted, KPI formulas documented in docstrings matching spec §6.

## Commands
```
web/:        pnpm dev | lint | typecheck | test | e2e | e2e:live
analytics/:  uvicorn app.main:app --reload | pytest | MOCK_MODE=1 uvicorn ...
scripts:     node web/scripts/sap-smoke.mjs | node web/scripts/seed.mjs
```

## SAP gotchas (inherited from ProcureFlow — do not relearn)
- OData v4 writes need `x-csrf-token` from a prior GET (`x-csrf-token: fetch`) AND that GET's cookies replayed. Proxy owns this centrally.
- BTP trial hibernates nightly: "connection refused" usually means start the system in the BTP cockpit, not a code bug. Trial resets happen: recovery = abapGit pull + `docs/REDEPLOY.md`.
- Action URLs carry the namespace: `WorkOrder(...)/com.sap.gateway.srvd.zassetpulse_srv.v0001.StartWork`. Copy the base path from the published Service Binding; never guess.
- Cross-BO EML (StartWork/CompleteWork touching ZI_AP_EQUIPMENT) runs IN LOCAL MODE inside the work-order behavior pool.

## Status (update as phases land)
- [x] Plan written via writing-plans — `docs/superpowers/plans/2026-07-16-assetpulse.md`
- [ ] ABAP active + abapGit linked + ABAP Unit green + ATC clean
- [ ] Binding published + comm user + smoke green
- [ ] Design tokens + screens approved
- [ ] Frontend complete (mock gates green)
- [ ] Analytics live on Render
- [ ] Live E2E + seed + docs + v1.0.0
