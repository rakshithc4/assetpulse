# AssetPulse — Design Specification
**Repo location: `docs/superpowers/specs/2026-07-16-assetpulse-design.md`**
Status: Approved (brainstormed + design accepted 2026-07-16) · Owner: Rakshith Chandra Shekar

Asset maintenance operations product modelled on SAP Plant Maintenance (PM), targeting the Perth mining sector. System of record: SAP RAP business objects on BTP ABAP Environment. Product surface: dark-first Next.js control-room app + Python FastAPI analytics service. This is the owner's flagship portfolio project for SAP internship/full-time applications in Sydney and Perth — depth, polish, and professionalism are explicit requirements, not nice-to-haves.

---

## 1. Purpose and success criteria

Mining operators (BHP, Rio Tinto, Fortescue — all SAP PM shops) manage billions in equipment through maintenance workflows: a fault is reported, triaged into a work order, scheduled, executed, and analysed. AssetPulse implements this end-to-end.

Success =
1. Live demo: report fault → convert → schedule → start (equipment flips to MAINTENANCE) → complete (equipment flips back, downtime recorded) → KPI change visible on Insights — all on real SAP data.
2. Every quality gate green: ABAP Unit + clean ATC; `pnpm lint/typecheck/test/e2e`; `pytest`; GitHub Actions CI passing on main.
3. A recruiter can, from the README alone, run mock mode in <10 min and understand what SAP competencies this demonstrates.

## 2. Architecture

```
Browser (dark control-room UI)
  └─ Next.js on Vercel
       ├─ /api/sap/[...path]     → server proxy (basic auth + CSRF + cookies) → SAP BTP OData v4
       └─ /api/insights/[...]    → proxies FastAPI analytics service
SAP BTP ABAP Environment: OData v4 ← RAP managed BOs ← CDS ← HANA (3 tables)
FastAPI on Render: httpx → SAP OData → pandas KPIs → JSON (5-min cache; fixture mock mode)
```

Constraints carried over from ProcureFlow (proven): Claude Code cannot reach BTP — ABAP source lives in `abap/`, activated manually in Eclipse ADT at 🧑 checkpoints; BTP trial hibernates nightly and can be reset (abapGit + redeploy runbook are the recovery path); no SAP credentials ever reach the browser.

## 3. Domain model

### Entity: Equipment — table `ZEQUIPMENT`
| Field | Type | Notes |
|---|---|---|
| client / equip_id | abap.clnt / sysuuid_x16 | keys; managed numbering |
| equip_tag | abap.char(20) | human ID, e.g. "CRU-104"; unique; monospace in UI |
| name | abap.char(100) | "Primary crusher — Line 1" |
| equip_type | abap.char(20) | CRUSHER, CONVEYOR, PUMP, HAUL_TRUCK, DRILL |
| site | abap.char(40) | e.g. "Pilbara Site A" |
| criticality | abap.char(10) | LOW, MEDIUM, HIGH, CRITICAL |
| op_status | abap.char(15) | OPERATIONAL, MAINTENANCE, DOWN |
| installed_on | abap.dats | |
| created_at / changed_at | timestampl | @Semantics-managed |

### Entity: Maintenance Request — table `ZMAINT_REQ`
| Field | Type | Notes |
|---|---|---|
| client / req_id | keys | managed numbering |
| equip_id | sysuuid_x16 | FK → ZEQUIPMENT (association `_Equipment`) |
| title | abap.char(100) | required |
| description | abap.char(255) | |
| severity | abap.char(10) | LOW, MEDIUM, HIGH, CRITICAL |
| status | abap.char(15) | REPORTED → CONVERTED \| REJECTED |
| reported_by | abap.char(12) | |
| reject_note | abap.char(255) | required on reject |
| created_at / changed_at | timestampl | |

### Entity: Work Order — table `ZWORK_ORDER`
| Field | Type | Notes |
|---|---|---|
| client / order_id | keys | managed numbering |
| req_id / equip_id | sysuuid_x16 | FKs; associations `_Request`, `_Equipment` |
| priority | abap.char(10) | copied from severity at conversion, editable |
| status | abap.char(15) | CREATED → SCHEDULED → IN_PROGRESS → COMPLETED; CANCELLED allowed from CREATED/SCHEDULED |
| assigned_to | abap.char(12) | technician id |
| scheduled_date | abap.dats | |
| started_at / completed_at | timestampl | set by actions |
| downtime_hours | abap.dec(7,2) | ≥ 0; captured at completion |
| completion_notes | abap.char(255) | |
| cancel_note | abap.char(255) | required on cancel |
| created_at / changed_at | timestampl | |

### Status machines (server-enforced; UI mirrors via feature control)
- Request: REPORTED —ConvertToWorkOrder→ CONVERTED; REPORTED —RejectRequest(note!)→ REJECTED. Both terminal. **RejectRequest also resets `_Equipment.op_status` to OPERATIONAL** if the request's severity is CRITICAL (mirrors the determination that set it DOWN at creation) — v1 does not check for other open CRITICAL requests against the same equipment; that refinement is `docs/V2_BACKLOG.md`.
- WorkOrder: CREATED —Schedule(date, technician)→ SCHEDULED —StartWork→ IN_PROGRESS —CompleteWork(notes, downtime_hours)→ COMPLETED. CancelOrder(note!) valid from CREATED and SCHEDULED only.
- **Cross-entity effects (differentiator):** StartWork sets `_Equipment.op_status = MAINTENANCE`; CompleteWork sets it back to OPERATIONAL. Implemented via cross-BO EML inside the work-order behavior pool. CRITICAL-severity request creation sets equipment DOWN (and CompleteWork restores OPERATIONAL).

## 4. RAP layer (package `ZASSET_MAINT`)

- 3 root view entities `ZI_EQUIPMENT`, `ZI_MAINT_REQ`, `ZI_WORK_ORDER` + projections `ZC_*` (provider contract transactional_query) + metadata extensions for the Fiori Elements admin preview.
- Managed, `strict(2)`, etag master ChangedAt, managed UUID numbering, EML only.
- Abstract entities for action params: `ZA_REJECT {note}`, `ZA_SCHEDULE {scheduled_date, assigned_to}`, `ZA_COMPLETE {completion_notes, downtime_hours}`, `ZA_CANCEL {note}`, `ZA_CONVERT {priority}`.
- Actions (result [1] $self): ConvertToWorkOrder (also creates ZWORK_ORDER via EML, copies severity→priority default), RejectRequest, Schedule, StartWork, CompleteWork, CancelOrder.
- Determinations: initial statuses (REPORTED / CREATED / OPERATIONAL); severity CRITICAL → equipment DOWN.
- Validations: title not initial; severity/criticality/type within domain lists; downtime_hours ≥ 0; scheduled_date ≥ today.
- Instance feature control on Request + WorkOrder per the status machines (e.g. CompleteWork enabled only IN_PROGRESS).
- ABAP Unit `ZTC_ASSETPULSE`: ~10 EML tests — every legal transition, every illegal transition rejected with message, reject-without-note fails, downtime<0 fails, and both cross-entity effects asserted by reading `ZI_EQUIPMENT` after the action.
- Service: `ZASSETPULSE_SRV` exposing Equipment, MaintenanceRequest, WorkOrder; binding `ZUI_ASSETPULSE_O4` (OData V4 – UI); communication scenario `ZCS_ASSETPULSE` + comm user for external access.
- **abapGit from day one:** the ADT package is linked to the GitHub repo's `abap/` folder via abapGit, so real serialized ABAP is publicly visible (recruiter-checkable) and trial-reset recovery is one pull.

## 5. API contract (consumed by web + analytics)

Base: copy exact URL from published binding → `.env` `SAP_SERVICE_PATH`.
- CRUD per entity: `GET/POST Equipment|MaintenanceRequest|WorkOrder`, `GET .../(ID)?$expand=_Equipment(,_Request)`, `PATCH` (drafts of master data / pre-submit edits).
- Actions: `POST <Entity>(ID)/com.sap.gateway.srvd.zassetpulse_srv.v0001.<Action>` with JSON param body; CSRF token required (proxy handles).
- Filters used by UI: `$filter=status eq '...'`, `$filter=op_status eq '...'`, `$search=`, `$orderby=ChangedAt desc`, `$count=true`.
- Errors: OData v4 error JSON normalized by proxy to `{status, code, message}`.

## 6. Analytics service (`analytics/`, FastAPI, deployed on Render free tier)

Endpoints (all GET, JSON):
| Endpoint | Returns |
|---|---|
| `/kpi/summary` | mttr_hours, open_requests_by_severity, open_orders, equipment_availability_pct, total_downtime_hours_30d |
| `/kpi/downtime?by=site\|type` | downtime_hours grouped, last 90 days |
| `/kpi/backlog-aging` | open request counts in buckets 0–7 / 8–30 / 30+ days |
| `/kpi/frequency` | requests per equipment type, last 90 days |

Definitions (documented in code + README): MTTR = mean(completed_at − started_at) over COMPLETED orders; availability % = OPERATIONAL / total equipment; aging bucketed on created_at.
Implementation: httpx client with the same basic-auth comm user (env vars), pandas aggregation, 5-minute in-memory TTL cache, `MOCK_MODE=1` serving from committed JSON fixtures (CI + demos never depend on BTP being awake). pytest suite over fixture data with exact expected KPI values. CORS restricted to the Vercel origin; consumed via Next.js `/api/insights/*` proxy so the browser hits one origin.

## 7. Frontend (`web/`, Next.js 14+ App Router, TS strict, Tailwind, shadcn/ui, TanStack Query, NextAuth, zod, MSW, Vitest, Playwright)

Roles: engineer@demo (report requests), supervisor@demo (convert/reject/schedule/cancel; sees everything), tech@demo (start/complete own assigned orders). NextAuth credentials, role claim in session; all role×status action logic in ONE matrix module (`web/src/lib/domain.ts`) with 100% branch-tested truth table — UI never re-implements checks.

Routes:
- `/login` — three demo personas as one-click cards.
- `/` **Control room** — KPI strip (from analytics summary), equipment status board (grid of tags color-coded by op_status, 30s polling), critical alerts panel (CRITICAL severity REPORTED requests), recent activity feed.
- `/equipment` + `/equipment/[id]` — register table (tag, name, type, site, criticality, status) with filters; detail = header card + maintenance history timeline (requests + orders merged, newest first) + "Report fault" CTA.
- `/requests` + `/requests/new` + `/requests/[id]` — severity-coded list; new-request form (equipment picker, zod-validated); detail with Convert (opens priority dialog) / Reject (note required) per role.
- `/orders` + `/orders/[id]` — supervisor sees all, technician defaults to "My orders"; detail = status stepper (Created→Scheduled→In progress→Completed), action bar from the matrix, Schedule dialog (date+technician), Complete dialog (notes + downtime hours, zod ≥ 0), linked request + equipment cards.
- `/insights` — four chart panels mapping 1:1 to the analytics endpoints (Recharts), with range note and mock-mode badge when applicable.

Every data view ships loading skeleton, empty state, error state with retry. Mutations: optimistic update → invalidate; rollback + toast on 4xx/5xx. Confirmation dialogs on all irreversible actions.

## 8. Design language (binding; full detail in DESIGN_BRIEF.md → executed via Claude Design before any UI code)

Dark-first operations control room: near-black layered surfaces, high-contrast type, monospace accents for equipment tags/IDs/timestamps, a severity/criticality color system (LOW→CRITICAL) and an op-status system (OPERATIONAL/MAINTENANCE/DOWN) that never rely on color alone (always icon or label), restrained motion (≤200ms, reduced-motion respected), WCAG AA on all pairings. Distinctive, not template-flavored — this app should be visually memorable in a portfolio review. Light mode is a stretch goal, not v1.

## 9. Quality, CI, and professionalism layer (the "extras", binding)

1. **GitHub Actions CI**: on push/PR — web (lint, typecheck, vitest, playwright mock-mode) + analytics (ruff, pytest). Badge in README. No merge to main with red CI.
2. **ADRs** in `docs/adr/`: 0001 RAP managed over unmanaged; 0002 server-side proxy for SAP auth; 0003 separate FastAPI analytics service; 0004 dark-first design direction; 0005 abapGit source-of-truth strategy. One page each: context, decision, consequences.
3. **Seed script** `web/scripts/seed.mjs`: creates via the live API ~12 realistic equipment records across 2 sites (Pilbara Site A / Goldfields Site B), ~10 requests in mixed severities/statuses, ~8 orders across the lifecycle — so every demo screen looks real, never lorem ipsum.
4. **Docs**: `docs/REDEPLOY.md` (BTP reset runbook), `docs/CASE_STUDY.md` (consulting-style: problem, solution, architecture, outcomes — Perth mining framing), `docs/DEMO.md` (3-minute script), README with hero screenshot, live URLs, CI badge, and a "What this demonstrates" table mapping features → SAP consulting competencies (RAP, CDS, EML, cross-BO logic, OData integration, Clean Core).
5. **Resume/LinkedIn bullets** generated at the end with real numbers (entities, actions, tests, endpoints, routes).

## 10. Out of scope (v1, binding)
Email/push notifications; attachments; preventive-maintenance rules; multi-level approvals; real SAP authorization objects; offline mode; light theme; i18n. Backlog lives in `docs/V2_BACKLOG.md`.

## 11. Milestones
| # | Deliverable | Target |
|---|---|---|
| 1 | Repo + CLAUDE.md + CI skeleton | Day 1 |
| 2 | ABAP authored, activated, abapGit-linked, ABAP Unit green, ATC clean | Wk 1–2 |
| 3 | Binding published, comm user, smoke script green | Wk 2 |
| 4 | Claude Design system + all screens/states signed off | Wk 3 |
| 5 | Frontend feature-complete, all mock-mode gates green | Wk 4–5 |
| 6 | Analytics service live on Render, Insights wired | Wk 5 |
| 7 | Live E2E on Vercel + BTP; seed data; docs; v1.0.0 | Wk 6 |

## Spec self-review (completed)
Placeholders: none — all fields, statuses, endpoints, and KPI formulas are exact. Consistency: status machines in §3 match actions in §4, feature control in §4/§7, and stepper in §7; analytics fields in §6 exist in §3's model. Scope: single product, three thin subsystems sharing one domain — one plan is appropriate; the plan itself will be phase-gated. Ambiguity resolved: priority defaults from severity but is editable at conversion; CRITICAL request downs equipment at creation (not at conversion); technician sees own orders by default but can view all read-only.
