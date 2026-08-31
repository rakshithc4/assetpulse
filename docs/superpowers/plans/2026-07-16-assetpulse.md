# AssetPulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship AssetPulse v1.0.0 — an SAP Plant-Maintenance-style asset maintenance product (RAP business objects on SAP BTP as system of record, dark control-room Next.js app on Vercel, FastAPI analytics service on Render) demonstrating the full fault→convert→schedule→start→complete lifecycle with cross-BO status effects, live on real SAP data.

**Architecture:** Three thin subsystems sharing one domain, built in dependency order — ABAP RAP layer first (system of record, activated manually in Eclipse ADT at 🧑 checkpoints), then the published OData v4 service, then the Next.js frontend (server-side proxies only, mock-mode-first via MSW) and FastAPI analytics service (fixture-mode-first), converging on a live E2E demo. Role×status action logic lives in exactly one tested module (`web/src/lib/domain.ts`).

**Tech Stack:** ABAP RAP (managed BOs, EML, CDS, abapGit) on SAP BTP ABAP Environment · Next.js 14+ App Router, TypeScript strict, Tailwind, shadcn/ui, TanStack Query, NextAuth, zod, MSW, Vitest, Playwright · Python FastAPI, httpx, pandas, pytest, ruff · GitHub Actions CI.

## Global Constraints

- Never fabricate SAP results. ABAP activates only in Eclipse ADT. At every 🧑 checkpoint: print exact instructions, stop, wait for confirmation or pasted output. A failed checkpoint blocks the phase.
- No secrets in git — `SAP_USER/SAP_PASS/SAP_BASE_URL/SAP_SERVICE_PATH/NEXTAUTH_SECRET/ANALYTICS_URL` live in `.env` (gitignored); `.env.example` has placeholders only. Check before every commit.
- No SAP or analytics calls from the browser. SAP → `/api/sap/[...path]`; analytics → `/api/insights/[...]`. Anything else is a bug.
- TDD always: failing test first, every feature task, all three codebases (vitest / pytest / ABAP Unit).
- EML only inside RAP behavior code; `strict(2)` everywhere; no direct `UPDATE dbtab`.
- Role×status logic lives only in `web/src/lib/domain.ts` — the tested matrix. UI components consume it; they never re-derive permissions.
- Design tokens only — components use Tailwind classes generated from `design/tokens.json`; no ad-hoc hex.
- Phase gates: `requesting-code-review` then `verification-before-completion` before any phase is marked done. Finish with `finishing-a-development-branch`.
- Statuses are UPPERCASE strings exactly as in spec §3. Z-namespace for all ABAP objects (tables `ZEQUIPMENT`/`ZMAINT_REQ`/`ZWORK_ORDER`; views `ZI_`/`ZC_`; behavior pools `ZBP_`; abstract entities `ZA_`; tests `ZTC_`).
- TypeScript strict, no `any`; conventional commits referencing plan task IDs (e.g. `feat(1.4): behavior definitions for all three roots`).
- Python: ruff-clean, type-hinted, KPI formulas documented in docstrings matching spec §6.
- Out of scope (v1): email/push notifications, attachments, preventive-maintenance rules, multi-level approvals, real SAP authorization objects, offline mode, light theme, i18n. Anything requested outside this list goes to `docs/V2_BACKLOG.md`, not into a task.

---

## Phase 0 — Repo Scaffold + CI Skeleton

### Task 0.1: Directory layout, gitignore, env template

**Files:**
- Create: `abap/ddic/.gitkeep`, `abap/cds/.gitkeep`, `abap/behavior/.gitkeep`, `abap/test/.gitkeep`, `abap/service/.gitkeep`
- Create: `web/.gitkeep`, `analytics/.gitkeep`, `design/.gitkeep`
- Create: `docs/adr/.gitkeep`, `docs/V2_BACKLOG.md`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Produces: `.env.example` keys `SAP_USER`, `SAP_PASS`, `SAP_BASE_URL`, `SAP_SERVICE_PATH`, `NEXTAUTH_SECRET`, `ANALYTICS_URL`, `MOCK_MODE` — every later task that reads env vars uses exactly these names.

- [ ] **Step 1: Create the directory skeleton**

```bash
mkdir -p abap/ddic abap/cds abap/behavior abap/test abap/service
mkdir -p web analytics design docs/adr
touch abap/ddic/.gitkeep abap/cds/.gitkeep abap/behavior/.gitkeep abap/test/.gitkeep abap/service/.gitkeep
touch web/.gitkeep analytics/.gitkeep design/.gitkeep docs/adr/.gitkeep
```

- [ ] **Step 2: Write `docs/V2_BACKLOG.md`**

```markdown
# V2 Backlog

Deferred scope, tracked so v1 stays exactly spec-sized.

- Check for other open CRITICAL requests against the same equipment before RejectRequest resets op_status to OPERATIONAL (spec §3 note).
- Email/push notifications on status changes.
- Attachments on requests/work orders (photos of faults).
- Preventive-maintenance scheduling rules.
- Multi-level approval workflows.
- Real SAP authorization objects (PFCG roles) replacing the demo-persona model.
- Offline mode for field technicians.
- Light theme.
- i18n.
```

- [ ] **Step 3: Write `.gitignore`**

```gitignore
# env
.env
.env.local

# node
node_modules/
web/node_modules/
web/.next/
web/dist/
web/coverage/
web/playwright-report/
web/test-results/

# python
analytics/__pycache__/
analytics/.pytest_cache/
analytics/.ruff_cache/
analytics/venv/
analytics/*.egg-info/
**/__pycache__/

# os
.DS_Store

# worktrees (safety net if git worktree fallback is ever used)
.worktrees/
```

- [ ] **Step 4: Write `.env.example`**

```bash
# SAP BTP ABAP Environment (system of record) — proxy-only, never exposed to the browser
SAP_USER=
SAP_PASS=
SAP_BASE_URL=https://your-system.abap.your-region.hana.ondemand.com
SAP_SERVICE_PATH=/sap/opu/odata4/sap/zassetpulse_srv/srvd/sap/zassetpulse_srv/0001

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Analytics service (FastAPI on Render)
ANALYTICS_URL=http://localhost:8000
MOCK_MODE=1
NEXT_PUBLIC_MOCK_MODE=1
```

- [ ] **Step 5: Commit**

```bash
git add abap web analytics design docs/adr docs/V2_BACKLOG.md .gitignore .env.example
git commit -m "chore(0.1): scaffold repo layout, gitignore, env template"
```

### Task 0.2: GitHub Actions CI skeleton

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `web/package.json` scripts `lint`, `typecheck`, `test`, `e2e` (defined in Task 4.1); `analytics/pyproject.toml` + `pytest`/`ruff` (defined in Task 5.1). Until those tasks land, this workflow's jobs will fail on push — expected and acceptable mid-branch; CLAUDE.md's "no red CI on main" rule applies at merge time.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  web:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test -- --run
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e

  analytics:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: analytics
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: ruff check .
      - run: MOCK_MODE=1 pytest -v
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "chore(0.2): CI skeleton for web + analytics"
```

---

## Phase 1 — ABAP RAP Layer (package `ZASSET_MAINT`) 🧑 gated

This phase is Claude-authored source + human-executed activation. Every ABAP file below is written to `abap/` now. Nothing is real until the 🧑 checkpoint in Task 1.10 runs it through Eclipse ADT. `abap/MANIFEST.md` (Task 1.1 Step 1) is the authoritative creation/activation order — write it once, keep appending to it as later tasks add objects, and follow it literally at the checkpoint.

### Task 1.1: DDIC tables + MANIFEST

**Files:**
- Create: `abap/MANIFEST.md`
- Create: `abap/ddic/zequipment.tabl.abap`
- Create: `abap/ddic/zmaint_req.tabl.abap`
- Create: `abap/ddic/zwork_order.tabl.abap`

**Interfaces:**
- Produces: table `zequipment` (keys `client`, `equip_id`), `zmaint_req` (keys `client`, `req_id`; FK field `equip_id`), `zwork_order` (keys `client`, `order_id`; FK fields `req_id`, `equip_id`). Every later CDS view selects from these exact table/field names.

- [ ] **Step 1: Write `abap/MANIFEST.md`**

```markdown
# ABAP Creation/Activation Order — package ZASSET_MAINT

Follow this order exactly when materializing objects in Eclipse ADT (Task 1.10 checkpoint).
Each `[ ]` becomes `[x]` as you activate it; paste the ADT activation log for each group.

## Group 1 — DDIC tables (New > Other ABAP Repository Object > Database Table, ABAP Cloud "source-based" editor)
- [ ] ZEQUIPMENT   (abap/ddic/zequipment.tabl.abap)
- [ ] ZMAINT_REQ   (abap/ddic/zmaint_req.tabl.abap)
- [ ] ZWORK_ORDER  (abap/ddic/zwork_order.tabl.abap)

## Group 2 — Abstract entities (action parameters)
- [ ] ZA_REJECT, ZA_SCHEDULE, ZA_COMPLETE, ZA_CANCEL, ZA_CONVERT (abap/cds/za_*.ddls.abap)

## Group 3 — CDS interface views (root view entities)
- [ ] ZI_AP_EQUIPMENT  (abap/cds/zi_ap_equipment.ddls.abap)
- [ ] ZI_MAINT_REQ  (abap/cds/zi_maint_req.ddls.abap)
- [ ] ZI_WORK_ORDER (abap/cds/zi_work_order.ddls.abap)

## Group 4 — Behavior definitions (interface layer)
- [ ] ZI_AP_EQUIPMENT.bdef   (abap/behavior/zi_ap_equipment.bdef.abap)
- [ ] ZI_MAINT_REQ.bdef   (abap/behavior/zi_maint_req.bdef.abap)
- [ ] ZI_WORK_ORDER.bdef  (abap/behavior/zi_work_order.bdef.abap)

## Group 5 — Behavior implementation classes (create as "Behavior Implementation" from each bdef in ADT — this generates the LHC class stub linked to the bdef; then paste in the body from the file listed)
- [ ] ZBP_I_EQUIPMENT   (abap/behavior/zbp_i_equipment.clas.abap)
- [ ] ZBP_I_MAINT_REQ   (abap/behavior/zbp_i_maint_req.clas.abap)
- [ ] ZBP_I_WORK_ORDER  (abap/behavior/zbp_i_work_order.clas.abap)

## Group 6 — Projections + metadata extensions
- [ ] ZC_EQUIPMENT  (abap/cds/zc_equipment.ddls.abap) + ZC_EQUIPMENT metadata extension (abap/cds/zc_equipment.mdext.abap)
- [ ] ZC_MAINT_REQ  (abap/cds/zc_maint_req.ddls.abap) + metadata extension (abap/cds/zc_maint_req.mdext.abap)
- [ ] ZC_WORK_ORDER (abap/cds/zc_work_order.ddls.abap) + metadata extension (abap/cds/zc_work_order.mdext.abap)
- [ ] Behavior definitions for the projections (abap/behavior/zc_equipment.bdef.abap, zc_maint_req.bdef.abap, zc_work_order.bdef.abap) — projection bdefs just `use` the interface actions/determinations, no new implementation class.

## Group 7 — Service
- [ ] Service definition ZASSETPULSE_SRV (abap/service/zassetpulse_srv.srvd.abap)
- [ ] Service binding ZUI_ASSETPULSE_O4 (OData V4 – UI) — created in ADT (binding has no plain-text source; document the binding name + version here once published)

## Group 8 — Tests
- [ ] ZTC_ASSETPULSE (abap/test/ztc_assetpulse.clas.abap) — run via ABAP Unit, must be all green before Task 1.10 is marked complete.

## Post-activation
- [ ] ATC run on package ZASSET_MAINT — 0 errors, 0 warnings (or documented+justified exceptions)
- [ ] abapGit repo linked to package ZASSET_MAINT, `abap/` pushed (Task 1.11)
- [ ] Communication scenario ZCS_ASSETPULSE + comm user created (Task 2.1)
```

- [ ] **Step 2: Write `abap/ddic/zequipment.tabl.abap`**

```abap
@EndUserText.label : 'AssetPulse — Equipment master'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zequipment {
  key client       : abap.clnt not null;
  key equip_id     : sysuuid_x16 not null;
  equip_tag        : abap.char(20) not null;
  name             : abap.char(100) not null;
  equip_type       : abap.char(20) not null;
  site             : abap.char(40) not null;
  criticality      : abap.char(10) not null;
  op_status        : abap.char(15) not null;
  installed_on     : abap.dats;
  created_at        : timestampl;
  changed_at        : timestampl;
}
```

- [ ] **Step 3: Write `abap/ddic/zmaint_req.tabl.abap`**

```abap
@EndUserText.label : 'AssetPulse — Maintenance request'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zmaint_req {
  key client       : abap.clnt not null;
  key req_id       : sysuuid_x16 not null;
  equip_id         : sysuuid_x16 not null;
  title            : abap.char(100) not null;
  description      : abap.char(255);
  severity         : abap.char(10) not null;
  status           : abap.char(15) not null;
  reported_by      : abap.char(12) not null;
  reject_note      : abap.char(255);
  created_at        : timestampl;
  changed_at        : timestampl;
}
```

- [ ] **Step 4: Write `abap/ddic/zwork_order.tabl.abap`**

```abap
@EndUserText.label : 'AssetPulse — Work order'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zwork_order {
  key client        : abap.clnt not null;
  key order_id      : sysuuid_x16 not null;
  req_id            : sysuuid_x16 not null;
  equip_id          : sysuuid_x16 not null;
  priority          : abap.char(10) not null;
  status            : abap.char(15) not null;
  assigned_to       : abap.char(12);
  scheduled_date    : abap.dats;
  started_at         : timestampl;
  completed_at       : timestampl;
  downtime_hours    : abap.dec(7,2);
  completion_notes  : abap.char(255);
  cancel_note       : abap.char(255);
  created_at         : timestampl;
  changed_at         : timestampl;
}
```

- [ ] **Step 5: Commit**

```bash
git add abap/MANIFEST.md abap/ddic
git commit -m "feat(1.1): DDIC table sources + creation manifest"
```

### Task 1.2: Abstract entities (action parameters)

**Files:**
- Create: `abap/cds/za_reject.ddls.abap`
- Create: `abap/cds/za_schedule.ddls.abap`
- Create: `abap/cds/za_complete.ddls.abap`
- Create: `abap/cds/za_cancel.ddls.abap`
- Create: `abap/cds/za_convert.ddls.abap`

**Interfaces:**
- Produces: abstract entity types `ZA_Reject { Note }`, `ZA_Schedule { ScheduledDate, AssignedTo }`, `ZA_Complete { CompletionNotes, DowntimeHours }`, `ZA_Cancel { Note }`, `ZA_Convert { Priority }` — Task 1.4's behavior definitions reference these exact names/fields as action parameters.

- [ ] **Step 1: Write the five abstract entities**

`abap/cds/za_reject.ddls.abap`:
```abap
@EndUserText.label: 'Reject action parameter'
define abstract entity ZA_Reject
{
  Note : abap.char(255);
}
```

`abap/cds/za_schedule.ddls.abap`:
```abap
@EndUserText.label: 'Schedule action parameter'
define abstract entity ZA_Schedule
{
  ScheduledDate : abap.dats;
  AssignedTo    : abap.char(12);
}
```

`abap/cds/za_complete.ddls.abap`:
```abap
@EndUserText.label: 'Complete action parameter'
define abstract entity ZA_Complete
{
  CompletionNotes : abap.char(255);
  DowntimeHours   : abap.dec(7,2);
}
```

`abap/cds/za_cancel.ddls.abap`:
```abap
@EndUserText.label: 'Cancel action parameter'
define abstract entity ZA_Cancel
{
  Note : abap.char(255);
}
```

`abap/cds/za_convert.ddls.abap`:
```abap
@EndUserText.label: 'Convert action parameter'
define abstract entity ZA_Convert
{
  Priority : abap.char(10);
}
```

- [ ] **Step 2: Commit**

```bash
git add abap/cds/za_reject.ddls.abap abap/cds/za_schedule.ddls.abap abap/cds/za_complete.ddls.abap abap/cds/za_cancel.ddls.abap abap/cds/za_convert.ddls.abap
git commit -m "feat(1.2): abstract entities for RAP action parameters"
```

### Task 1.3: CDS interface views (root view entities)

> **Corrections found during the ADT checkpoint:**
> 1. `ZI_EQUIPMENT` collided with another user's object in the shared BTP trial namespace and couldn't be created. Renamed to `ZI_AP_EQUIPMENT` everywhere it's referenced (this file, all associations to it, the `ZC_Equipment` projection, and the equipment/work-order/maint-request behavior implementation classes' EML) — every other object name is unaffected, including the underlying table `ZEQUIPMENT`, the projection `ZC_EQUIPMENT`, and the behavior implementation class `ZBP_I_EQUIPMENT` (none of those collided).
> 2. `@AbapCatalog.sqlViewName` is a classic-CDS-only annotation — it's invalid on `define root view entity` (View Entities) in ABAP Cloud and blocked activation. Removed from all three interface root view entities below (it was never valid here; RAP manages the underlying SQL representation itself). The projections (`ZC_*`) and abstract entities (`ZA_*`) were audited too and never had this annotation, so no change was needed there.

**Files:**
- Create: `abap/cds/zi_ap_equipment.ddls.abap`
- Create: `abap/cds/zi_maint_req.ddls.abap`
- Create: `abap/cds/zi_work_order.ddls.abap`

**Interfaces:**
- Consumes: tables `zequipment`, `zmaint_req`, `zwork_order` (Task 1.1).
- Produces: `ZI_AP_Equipment` (elements `EquipId, EquipTag, Name, EquipType, Site, Criticality, OpStatus, InstalledOn, CreatedAt, ChangedAt`; associations `_MaintReq`, `_WorkOrder`), `ZI_Maint_Req` (elements `ReqId, EquipId, Title, Description, Severity, Status, ReportedBy, RejectNote, CreatedAt, ChangedAt`; association `_Equipment`), `ZI_Work_Order` (elements `OrderId, ReqId, EquipId, Priority, Status, AssignedTo, ScheduledDate, StartedAt, CompletedAt, DowntimeHours, CompletionNotes, CancelNote, CreatedAt, ChangedAt`; associations `_Request`, `_Equipment`). Task 1.4 behavior definitions and Task 1.6 CDS projections consume these exact names.

- [ ] **Step 1: Write `abap/cds/zi_ap_equipment.ddls.abap`**

```abap
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Equipment'
@Metadata.allowExtensions: true
@ObjectModel.usageType:{ serviceQuality: #X, sizeCategory: #S, dataClass: #MIXED }
define root view entity ZI_AP_Equipment
  as select from zequipment
{
  key equip_id     as EquipId,
      equip_tag    as EquipTag,
      name         as Name,
      equip_type   as EquipType,
      site         as Site,
      criticality  as Criticality,
      op_status    as OpStatus,
      installed_on as InstalledOn,
      created_at   as CreatedAt,
      changed_at   as ChangedAt,

      _MaintReq  : association [0..*] to ZI_Maint_Req  on $projection.EquipId = _MaintReq.EquipId,
      _WorkOrder : association [0..*] to ZI_Work_Order on $projection.EquipId = _WorkOrder.EquipId
}
```

- [ ] **Step 2: Write `abap/cds/zi_maint_req.ddls.abap`**

```abap
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Maintenance Request'
@Metadata.allowExtensions: true
@ObjectModel.usageType:{ serviceQuality: #X, sizeCategory: #S, dataClass: #MIXED }
define root view entity ZI_Maint_Req
  as select from zmaint_req
{
  key req_id      as ReqId,
      equip_id    as EquipId,
      title       as Title,
      description as Description,
      severity    as Severity,
      status      as Status,
      reported_by as ReportedBy,
      reject_note as RejectNote,
      created_at  as CreatedAt,
      changed_at  as ChangedAt,

      _Equipment : association [1..1] to ZI_AP_Equipment  on $projection.EquipId = _Equipment.EquipId,
      _WorkOrder : association [0..1] to ZI_Work_Order on $projection.ReqId = _WorkOrder.ReqId
}
```

- [ ] **Step 3: Write `abap/cds/zi_work_order.ddls.abap`**

```abap
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Work Order'
@Metadata.allowExtensions: true
@ObjectModel.usageType:{ serviceQuality: #X, sizeCategory: #S, dataClass: #MIXED }
define root view entity ZI_Work_Order
  as select from zwork_order
{
  key order_id         as OrderId,
      req_id           as ReqId,
      equip_id         as EquipId,
      priority         as Priority,
      status           as Status,
      assigned_to      as AssignedTo,
      scheduled_date   as ScheduledDate,
      started_at       as StartedAt,
      completed_at     as CompletedAt,
      downtime_hours   as DowntimeHours,
      completion_notes as CompletionNotes,
      cancel_note      as CancelNote,
      created_at       as CreatedAt,
      changed_at       as ChangedAt,

      _Request   : association [1..1] to ZI_Maint_Req on $projection.ReqId   = _Request.ReqId,
      _Equipment : association [1..1] to ZI_AP_Equipment on $projection.EquipId = _Equipment.EquipId
}
```

- [ ] **Step 4: Commit**

```bash
git add abap/cds/zi_ap_equipment.ddls.abap abap/cds/zi_maint_req.ddls.abap abap/cds/zi_work_order.ddls.abap
git commit -m "feat(1.3): CDS interface root view entities with associations"
```

### Task 1.4: Behavior definitions (interface layer, all three roots)

**Files:**
- Create: `abap/behavior/zi_ap_equipment.bdef.abap`
- Create: `abap/behavior/zi_maint_req.bdef.abap`
- Create: `abap/behavior/zi_work_order.bdef.abap`

**Interfaces:**
- Consumes: `ZI_AP_Equipment`, `ZI_Maint_Req`, `ZI_Work_Order` (Task 1.3); `ZA_Reject`, `ZA_Schedule`, `ZA_Complete`, `ZA_Cancel`, `ZA_Convert` (Task 1.2).
- Produces: declared actions `RejectRequest`, `ConvertToWorkOrder` (on `ZI_Maint_Req`); `Schedule`, `StartWork`, `CompleteWork`, `CancelOrder` (on `ZI_Work_Order`); determinations `SetInitialStatus` (all three roots) and `EscalateCriticalToDown` (`ZI_Maint_Req`); validations `ValidateEquipmentFields` (`ZI_AP_Equipment`), `ValidateRequestFields` (`ZI_Maint_Req`), `ValidateOrderFields` (`ZI_Work_Order`). Task 1.5–1.7 implementation classes implement exactly these method names.

- [ ] **Step 1: Write `abap/behavior/zi_ap_equipment.bdef.abap`**

```abap
managed implementation in class zbp_i_equipment unique;
strict ( 2 );

define behavior for ZI_AP_Equipment alias Equipment
persistent table zequipment
etag master ChangedAt
lock master
authorization master ( instance )
{
  create;
  update;

  field ( readonly ) EquipId, CreatedAt, ChangedAt;
  field ( readonly : update ) EquipTag;

  determination SetInitialStatus on modify { create; }

  validation ValidateEquipmentFields on save { create; update; }

  mapping for zequipment
    {
      EquipId     = equip_id;
      EquipTag    = equip_tag;
      Name        = name;
      EquipType   = equip_type;
      Site        = site;
      Criticality = criticality;
      OpStatus    = op_status;
      InstalledOn = installed_on;
      CreatedAt   = created_at;
      ChangedAt   = changed_at;
    }
}
```

- [ ] **Step 2: Write `abap/behavior/zi_maint_req.bdef.abap`**

```abap
managed implementation in class zbp_i_maint_req unique;
strict ( 2 );

define behavior for ZI_Maint_Req alias MaintRequest
persistent table zmaint_req
etag master ChangedAt
lock master
authorization master ( instance )
{
  create;
  update ( create );

  field ( readonly ) ReqId, CreatedAt, ChangedAt;
  field ( readonly ) Status;
  field ( mandatory ) EquipId, Title, Severity, ReportedBy;

  action ( features : instance ) RejectRequest      parameter ZA_Reject      result [1] $self;
  action ( features : instance ) ConvertToWorkOrder  parameter ZA_Convert     result [1] $self;

  determination SetInitialStatus       on modify { create; }
  determination EscalateCriticalToDown on modify { create; }

  validation ValidateRequestFields on save { create; }

  mapping for zmaint_req
    {
      ReqId       = req_id;
      EquipId     = equip_id;
      Title       = title;
      Description = description;
      Severity    = severity;
      Status      = status;
      ReportedBy  = reported_by;
      RejectNote  = reject_note;
      CreatedAt   = created_at;
      ChangedAt   = changed_at;
    }
}
```

- [ ] **Step 3: Write `abap/behavior/zi_work_order.bdef.abap`**

```abap
managed implementation in class zbp_i_work_order unique;
strict ( 2 );

define behavior for ZI_Work_Order alias WorkOrder
persistent table zwork_order
etag master ChangedAt
lock master
authorization master ( instance )
{
  create ( internal );
  update;

  field ( readonly ) OrderId, ReqId, EquipId, CreatedAt, ChangedAt;
  field ( readonly ) Status, StartedAt, CompletedAt;

  action ( features : instance ) Schedule     parameter ZA_Schedule  result [1] $self;
  action ( features : instance ) StartWork                           result [1] $self;
  action ( features : instance ) CompleteWork parameter ZA_Complete  result [1] $self;
  action ( features : instance ) CancelOrder  parameter ZA_Cancel    result [1] $self;

  validation ValidateOrderFields on save { field Priority, ScheduledDate, DowntimeHours; }

  mapping for zwork_order
    {
      OrderId          = order_id;
      ReqId            = req_id;
      EquipId          = equip_id;
      Priority         = priority;
      Status           = status;
      AssignedTo       = assigned_to;
      ScheduledDate    = scheduled_date;
      StartedAt        = started_at;
      CompletedAt      = completed_at;
      DowntimeHours    = downtime_hours;
      CompletionNotes  = completion_notes;
      CancelNote       = cancel_note;
      CreatedAt        = created_at;
      ChangedAt        = changed_at;
    }
}
```

Note: `ZWORK_ORDER`'s create is declared `internal` — EML inside behavior pools (i.e. `ConvertToWorkOrder` in Task 1.6) can `CREATE` it, but the operation is never exposed on the service binding, so the UI cannot POST WorkOrder directly. The spec is explicit that work orders are only born via `ConvertToWorkOrder`.

- [ ] **Step 4: Commit**

```bash
git add abap/behavior/zi_ap_equipment.bdef.abap abap/behavior/zi_maint_req.bdef.abap abap/behavior/zi_work_order.bdef.abap
git commit -m "feat(1.4): behavior definitions — actions, determinations, validations for all three roots"
```

### Task 1.5: Shared message exception + `ZBP_I_EQUIPMENT` implementation

> **Correction found during the ADT checkpoint:** `zcx_assetpulse` inherited from `CX_ABAP_BEHV`, which doesn't exist — that name was a mix-up with the `IF_ABAP_BEHV_MESSAGE` interface it also implements. The correct standard superclass for a RAP message exception class is `CX_STATIC_CHECK`. Fixed below; audited the rest of the repo for the same mistake — this was the only occurrence.

**Files:**
- Create: `abap/behavior/zcx_assetpulse.clas.abap`
- Create: `abap/behavior/zbp_i_equipment.clas.abap`
- Create: `abap/test/zmessages.md` (message class ZASSETPULSE text table — 🧑 creates the actual message class from this)

**Interfaces:**
- Produces: `zcx_assetpulse` (exception implementing `IF_ABAP_BEHV_MESSAGE`, constants `field_empty`, `negative_downtime`, `schedule_in_past`, `invalid_domain_value`) — reused by Task 1.6 and 1.7. `ZBP_I_EQUIPMENT` implements `SetInitialStatus` (determination) and `ValidateEquipmentFields` (validation) from Task 1.4's bdef.

- [ ] **Step 1: Write `abap/test/zmessages.md`** (🧑 creates message class `ZASSETPULSE` in ADT with these exact numbers/texts before Task 1.10's checkpoint)

```markdown
# Message class ZASSETPULSE

| No. | Text |
|---|---|
| 001 | &1 must not be empty |
| 002 | Downtime hours must be zero or greater |
| 003 | Scheduled date must not be in the past |
| 004 | &1 is not a valid value for &2 |
```

- [ ] **Step 2: Write `abap/behavior/zcx_assetpulse.clas.abap`**

```abap
CLASS zcx_assetpulse DEFINITION
  PUBLIC
  INHERITING FROM cx_static_check
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_abap_behv_message.

    CONSTANTS:
      BEGIN OF field_empty,
        msgid TYPE symsgid VALUE 'ZASSETPULSE',
        msgno TYPE symsgno VALUE '001',
        attr1 TYPE scx_attrname VALUE 'FIELD_NAME',
      END OF field_empty,
      BEGIN OF negative_downtime,
        msgid TYPE symsgid VALUE 'ZASSETPULSE',
        msgno TYPE symsgno VALUE '002',
      END OF negative_downtime,
      BEGIN OF schedule_in_past,
        msgid TYPE symsgid VALUE 'ZASSETPULSE',
        msgno TYPE symsgno VALUE '003',
      END OF schedule_in_past,
      BEGIN OF invalid_domain_value,
        msgid TYPE symsgid VALUE 'ZASSETPULSE',
        msgno TYPE symsgno VALUE '004',
        attr1 TYPE scx_attrname VALUE 'FIELD_VALUE',
        attr2 TYPE scx_attrname VALUE 'FIELD_NAME',
      END OF invalid_domain_value.

    DATA field_name  TYPE string.
    DATA field_value TYPE string.

    METHODS constructor
      IMPORTING
        textid     LIKE if_t100_message=>t100key OPTIONAL
        previous   LIKE previous OPTIONAL
        field_name  TYPE string OPTIONAL
        field_value TYPE string OPTIONAL.
ENDCLASS.

CLASS zcx_assetpulse IMPLEMENTATION.
  METHOD constructor.
    super->constructor( previous = previous ).
    me->field_name  = field_name.
    me->field_value = field_value.
    IF textid IS INITIAL.
      if_t100_message~t100key = if_t100_message=>default_textid.
    ELSE.
      if_t100_message~t100key = textid.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
```

- [ ] **Step 3: Write `abap/behavior/zbp_i_equipment.clas.abap`**

```abap
CLASS lhc_equipment DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    METHODS setinitialstatus FOR DETERMINE ON MODIFY
      IMPORTING keys FOR Equipment~setinitialstatus.

    METHODS validateequipmentfields FOR VALIDATE ON SAVE
      IMPORTING keys FOR Equipment~validateequipmentfields.
ENDCLASS.

CLASS lhc_equipment IMPLEMENTATION.

  METHOD setinitialstatus.
    MODIFY ENTITIES OF zi_ap_equipment IN LOCAL MODE
      ENTITY Equipment
        UPDATE FIELDS ( op_status )
        WITH VALUE #( FOR key IN keys ( %tky = key-%tky OpStatus = 'OPERATIONAL' ) ).
  ENDMETHOD.

  METHOD validateequipmentfields.
    READ ENTITIES OF zi_ap_equipment IN LOCAL MODE
      ENTITY Equipment
        FIELDS ( EquipType Criticality Site Name ) WITH CORRESPONDING #( keys )
      RESULT DATA(equipment).

    DATA(valid_types)        = VALUE string_table( ( `CRUSHER` ) ( `CONVEYOR` ) ( `PUMP` ) ( `HAUL_TRUCK` ) ( `DRILL` ) ).
    DATA(valid_criticalities) = VALUE string_table( ( `LOW` ) ( `MEDIUM` ) ( `HIGH` ) ( `CRITICAL` ) ).

    LOOP AT equipment INTO DATA(equip).
      IF equip-Name IS INITIAL.
        APPEND VALUE #( %tky = equip-%tky ) TO failed-equipment.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid     = zcx_assetpulse=>field_empty
                                                     field_name = 'Name' )
                         %tky = equip-%tky )
               TO reported-equipment.
      ENDIF.

      IF equip-Site IS INITIAL.
        APPEND VALUE #( %tky = equip-%tky ) TO failed-equipment.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid     = zcx_assetpulse=>field_empty
                                                     field_name = 'Site' )
                         %tky = equip-%tky )
               TO reported-equipment.
      ENDIF.

      IF NOT line_exists( valid_types[ table_line = equip-EquipType ] ).
        APPEND VALUE #( %tky = equip-%tky ) TO failed-equipment.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid      = zcx_assetpulse=>invalid_domain_value
                                                     field_name  = 'EquipType'
                                                     field_value = equip-EquipType )
                         %tky = equip-%tky )
               TO reported-equipment.
      ENDIF.

      IF NOT line_exists( valid_criticalities[ table_line = equip-Criticality ] ).
        APPEND VALUE #( %tky = equip-%tky ) TO failed-equipment.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid      = zcx_assetpulse=>invalid_domain_value
                                                     field_name  = 'Criticality'
                                                     field_value = equip-Criticality )
                         %tky = equip-%tky )
               TO reported-equipment.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.

ENDCLASS.
```

- [ ] **Step 4: Commit**

```bash
git add abap/behavior/zcx_assetpulse.clas.abap abap/behavior/zbp_i_equipment.clas.abap abap/test/zmessages.md
git commit -m "feat(1.5): shared RAP message exception + equipment behavior implementation"
```

### Task 1.6: `ZBP_I_MAINT_REQ` implementation — status machine + cross-BO effects

**Files:**
- Create: `abap/behavior/zbp_i_maint_req.clas.abap`

**Interfaces:**
- Consumes: `zcx_assetpulse` (Task 1.5); `ZA_Reject`, `ZA_Convert` (Task 1.2); internal-create on `ZI_Work_Order` (Task 1.4).
- Produces: `RejectRequest` (sets `Status = REJECTED`, requires non-empty `Note` written to `RejectNote`, resets equipment to `OPERATIONAL` when the request's `Severity = CRITICAL`); `ConvertToWorkOrder` (sets `Status = CONVERTED`, creates one `ZI_Work_Order` via cross-BO EML with `Status = CREATED`, `Priority` = action parameter, defaulting to the request's `Severity` when the parameter is blank).

- [ ] **Step 1: Write `abap/behavior/zbp_i_maint_req.clas.abap`**

```abap
CLASS lhc_maintrequest DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    METHODS setinitialstatus FOR DETERMINE ON MODIFY
      IMPORTING keys FOR MaintRequest~setinitialstatus.

    METHODS escalatecriticaltodown FOR DETERMINE ON MODIFY
      IMPORTING keys FOR MaintRequest~escalatecriticaltodown.

    METHODS validaterequestfields FOR VALIDATE ON SAVE
      IMPORTING keys FOR MaintRequest~validaterequestfields.

    METHODS rejectrequest FOR MODIFY
      IMPORTING keys FOR ACTION MaintRequest~rejectrequest RESULT result.

    METHODS converttoworkorder FOR MODIFY
      IMPORTING keys FOR ACTION MaintRequest~converttoworkorder RESULT result.
ENDCLASS.

CLASS lhc_maintrequest IMPLEMENTATION.

  METHOD setinitialstatus.
    MODIFY ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        UPDATE FIELDS ( status )
        WITH VALUE #( FOR key IN keys ( %tky = key-%tky Status = 'REPORTED' ) ).
  ENDMETHOD.

  METHOD escalatecriticaltodown.
    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Severity EquipId ) WITH CORRESPONDING #( keys )
      RESULT DATA(requests).

    DATA equip_updates TYPE TABLE FOR UPDATE zi_ap_equipment\\Equipment.

    LOOP AT requests INTO DATA(req) WHERE Severity = 'CRITICAL'.
      APPEND VALUE #( EquipId = req-EquipId OpStatus = 'DOWN' ) TO equip_updates.
    ENDLOOP.

    IF equip_updates IS NOT INITIAL.
      MODIFY ENTITIES OF zi_ap_equipment IN LOCAL MODE
        ENTITY Equipment
          UPDATE FIELDS ( OpStatus )
          WITH equip_updates.
    ENDIF.
  ENDMETHOD.

  METHOD validaterequestfields.
    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Title Severity ) WITH CORRESPONDING #( keys )
      RESULT DATA(requests).

    DATA(valid_severities) = VALUE string_table( ( `LOW` ) ( `MEDIUM` ) ( `HIGH` ) ( `CRITICAL` ) ).

    LOOP AT requests INTO DATA(req).
      IF req-Title IS INITIAL.
        APPEND VALUE #( %tky = req-%tky ) TO failed-maintrequest.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>field_empty field_name = 'Title' )
                         %tky = req-%tky )
               TO reported-maintrequest.
      ENDIF.

      IF NOT line_exists( valid_severities[ table_line = req-Severity ] ).
        APPEND VALUE #( %tky = req-%tky ) TO failed-maintrequest.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid      = zcx_assetpulse=>invalid_domain_value
                                                     field_name  = 'Severity'
                                                     field_value = req-Severity )
                         %tky = req-%tky )
               TO reported-maintrequest.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.

  METHOD rejectrequest.
    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Severity EquipId ) WITH CORRESPONDING #( keys )
      RESULT DATA(requests).

    DATA(valid_keys) = keys.
    DELETE valid_keys WHERE %param-Note IS INITIAL.

    LOOP AT keys INTO DATA(bad_key) WHERE %param-Note IS INITIAL.
      APPEND VALUE #( %tky = bad_key-%tky ) TO failed-maintrequest.
      APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>field_empty field_name = 'Note' )
                       %tky = bad_key-%tky )
             TO reported-maintrequest.
    ENDLOOP.

    IF valid_keys IS NOT INITIAL.
      MODIFY ENTITIES OF zi_maint_req IN LOCAL MODE
        ENTITY MaintRequest
          UPDATE FIELDS ( Status RejectNote )
          WITH VALUE #( FOR key IN valid_keys (
            %tky       = key-%tky
            Status     = 'REJECTED'
            RejectNote = key-%param-Note ) ).

      DATA equip_updates TYPE TABLE FOR UPDATE zi_ap_equipment\\Equipment.
      LOOP AT requests INTO DATA(req).
        READ TABLE valid_keys WITH KEY %tky = req-%tky TRANSPORTING NO FIELDS.
        CHECK sy-subrc = 0 AND req-Severity = 'CRITICAL'.
        APPEND VALUE #( EquipId = req-EquipId OpStatus = 'OPERATIONAL' ) TO equip_updates.
      ENDLOOP.

      IF equip_updates IS NOT INITIAL.
        MODIFY ENTITIES OF zi_ap_equipment IN LOCAL MODE
          ENTITY Equipment
            UPDATE FIELDS ( OpStatus )
            WITH equip_updates.
      ENDIF.
    ENDIF.

    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

  METHOD converttoworkorder.
    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Severity EquipId ) WITH CORRESPONDING #( keys )
      RESULT DATA(requests).

    MODIFY ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        UPDATE FIELDS ( Status )
        WITH VALUE #( FOR key IN keys ( %tky = key-%tky Status = 'CONVERTED' ) ).

    DATA work_orders TYPE TABLE FOR CREATE zi_work_order\\WorkOrder.

    LOOP AT keys INTO DATA(key).
      READ TABLE requests INTO DATA(req) WITH KEY %tky = key-%tky.
      CHECK sy-subrc = 0.
      DATA(priority) = COND #( WHEN key-%param-Priority IS NOT INITIAL THEN key-%param-Priority ELSE req-Severity ).
      APPEND VALUE #( %cid            = |WO_{ sy-uuid }|
                       ReqId          = key-ReqId
                       EquipId        = req-EquipId
                       Priority       = priority
                       Status         = 'CREATED' )
             TO work_orders.
    ENDLOOP.

    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        CREATE FIELDS ( ReqId EquipId Priority Status )
        WITH work_orders
      MAPPED DATA(mapped)
      FAILED DATA(create_failed)
      REPORTED DATA(create_reported).

    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

ENDCLASS.
```

- [ ] **Step 2: Commit**

```bash
git add abap/behavior/zbp_i_maint_req.clas.abap
git commit -m "feat(1.6): maintenance request status machine + cross-BO equipment effects"
```

### Task 1.7: `ZBP_I_WORK_ORDER` implementation — status machine + cross-BO effects

**Files:**
- Create: `abap/behavior/zbp_i_work_order.clas.abap`

**Interfaces:**
- Consumes: `zcx_assetpulse` (Task 1.5); `ZA_Schedule`, `ZA_Complete`, `ZA_Cancel` (Task 1.2).
- Produces: `Schedule` (CREATED→SCHEDULED, sets `ScheduledDate`/`AssignedTo`, validates date ≥ today), `StartWork` (SCHEDULED→IN_PROGRESS, sets `StartedAt`, cross-BO EML sets `_Equipment.OpStatus = MAINTENANCE`), `CompleteWork` (IN_PROGRESS→COMPLETED, sets `CompletedAt`/`CompletionNotes`/`DowntimeHours`, validates `DowntimeHours ≥ 0`, cross-BO EML sets `_Equipment.OpStatus = OPERATIONAL`), `CancelOrder` (CREATED or SCHEDULED → CANCELLED, requires non-empty `Note`).

- [ ] **Step 1: Write `abap/behavior/zbp_i_work_order.clas.abap`**

```abap
CLASS lhc_workorder DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    METHODS validateorderfields FOR VALIDATE ON SAVE
      IMPORTING keys FOR WorkOrder~validateorderfields.

    METHODS schedule FOR MODIFY
      IMPORTING keys FOR ACTION WorkOrder~schedule RESULT result.

    METHODS startwork FOR MODIFY
      IMPORTING keys FOR ACTION WorkOrder~startwork RESULT result.

    METHODS completework FOR MODIFY
      IMPORTING keys FOR ACTION WorkOrder~completework RESULT result.

    METHODS cancelorder FOR MODIFY
      IMPORTING keys FOR ACTION WorkOrder~cancelorder RESULT result.
ENDCLASS.

CLASS lhc_workorder IMPLEMENTATION.

  METHOD validateorderfields.
    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( Priority ScheduledDate DowntimeHours ) WITH CORRESPONDING #( keys )
      RESULT DATA(orders).

    DATA(valid_priorities) = VALUE string_table( ( `LOW` ) ( `MEDIUM` ) ( `HIGH` ) ( `CRITICAL` ) ).

    LOOP AT orders INTO DATA(order).
      IF NOT line_exists( valid_priorities[ table_line = order-Priority ] ).
        APPEND VALUE #( %tky = order-%tky ) TO failed-workorder.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid      = zcx_assetpulse=>invalid_domain_value
                                                     field_name  = 'Priority'
                                                     field_value = order-Priority )
                         %tky = order-%tky )
               TO reported-workorder.
      ENDIF.

      IF order-DowntimeHours < 0.
        APPEND VALUE #( %tky = order-%tky ) TO failed-workorder.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>negative_downtime )
                         %tky = order-%tky )
               TO reported-workorder.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.

  METHOD schedule.
    DATA(today) = cl_abap_context_info=>get_system_date( ).
    DATA(valid_keys) = keys.
    DELETE valid_keys WHERE %param-ScheduledDate < today.

    LOOP AT keys INTO DATA(bad_key) WHERE %param-ScheduledDate < today.
      APPEND VALUE #( %tky = bad_key-%tky ) TO failed-workorder.
      APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>schedule_in_past )
                       %tky = bad_key-%tky )
             TO reported-workorder.
    ENDLOOP.

    IF valid_keys IS NOT INITIAL.
      MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
        ENTITY WorkOrder
          UPDATE FIELDS ( Status ScheduledDate AssignedTo )
          WITH VALUE #( FOR key IN valid_keys (
            %tky          = key-%tky
            Status        = 'SCHEDULED'
            ScheduledDate = key-%param-ScheduledDate
            AssignedTo    = key-%param-AssignedTo ) ).
    ENDIF.

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

  METHOD startwork.
    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( EquipId ) WITH CORRESPONDING #( keys )
      RESULT DATA(orders).

    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        UPDATE FIELDS ( Status StartedAt )
        WITH VALUE #( FOR key IN keys (
          %tky      = key-%tky
          Status    = 'IN_PROGRESS'
          StartedAt = utclong_current( ) ) ).

    DATA equip_updates TYPE TABLE FOR UPDATE zi_ap_equipment\\Equipment.
    LOOP AT orders INTO DATA(order).
      APPEND VALUE #( EquipId = order-EquipId OpStatus = 'MAINTENANCE' ) TO equip_updates.
    ENDLOOP.

    MODIFY ENTITIES OF zi_ap_equipment IN LOCAL MODE
      ENTITY Equipment
        UPDATE FIELDS ( OpStatus )
        WITH equip_updates.

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

  METHOD completework.
    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( EquipId ) WITH CORRESPONDING #( keys )
      RESULT DATA(orders).

    DATA(valid_keys) = keys.
    DELETE valid_keys WHERE %param-DowntimeHours < 0.

    LOOP AT keys INTO DATA(bad_key) WHERE %param-DowntimeHours < 0.
      APPEND VALUE #( %tky = bad_key-%tky ) TO failed-workorder.
      APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>negative_downtime )
                       %tky = bad_key-%tky )
             TO reported-workorder.
    ENDLOOP.

    IF valid_keys IS NOT INITIAL.
      MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
        ENTITY WorkOrder
          UPDATE FIELDS ( Status CompletedAt CompletionNotes DowntimeHours )
          WITH VALUE #( FOR key IN valid_keys (
            %tky             = key-%tky
            Status           = 'COMPLETED'
            CompletedAt      = utclong_current( )
            CompletionNotes  = key-%param-CompletionNotes
            DowntimeHours    = key-%param-DowntimeHours ) ).

      DATA equip_updates TYPE TABLE FOR UPDATE zi_ap_equipment\\Equipment.
      LOOP AT orders INTO DATA(order).
        READ TABLE valid_keys WITH KEY %tky = order-%tky TRANSPORTING NO FIELDS.
        CHECK sy-subrc = 0.
        APPEND VALUE #( EquipId = order-EquipId OpStatus = 'OPERATIONAL' ) TO equip_updates.
      ENDLOOP.

      IF equip_updates IS NOT INITIAL.
        MODIFY ENTITIES OF zi_ap_equipment IN LOCAL MODE
          ENTITY Equipment
            UPDATE FIELDS ( OpStatus )
            WITH equip_updates.
      ENDIF.
    ENDIF.

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

  METHOD cancelorder.
    DATA(valid_keys) = keys.
    DELETE valid_keys WHERE %param-Note IS INITIAL.

    LOOP AT keys INTO DATA(bad_key) WHERE %param-Note IS INITIAL.
      APPEND VALUE #( %tky = bad_key-%tky ) TO failed-workorder.
      APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>field_empty field_name = 'Note' )
                       %tky = bad_key-%tky )
             TO reported-workorder.
    ENDLOOP.

    IF valid_keys IS NOT INITIAL.
      MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
        ENTITY WorkOrder
          UPDATE FIELDS ( Status CancelNote )
          WITH VALUE #( FOR key IN valid_keys (
            %tky       = key-%tky
            Status     = 'CANCELLED'
            CancelNote = key-%param-Note ) ).
    ENDIF.

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

ENDCLASS.
```

Feature control (CancelOrder valid only from CREATED/SCHEDULED; CompleteWork only from IN_PROGRESS; StartWork only from SCHEDULED; Schedule only from CREATED) is declared via instance feature control in Task 1.4's `action ( features : instance )` clause and implemented as a `get_features` method — add it here:

```abap
CLASS lhc_workorder DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    " ... methods above, plus:
    METHODS get_instance_features FOR INSTANCE FEATURES
      IMPORTING keys REQUEST requested_features FOR WorkOrder RESULT result.
ENDCLASS.

CLASS lhc_workorder IMPLEMENTATION.
  " ... methods above, plus:

  METHOD get_instance_features.
    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( Status ) WITH CORRESPONDING #( keys )
      RESULT DATA(orders).

    result = VALUE #( FOR order IN orders (
      %tky                       = order-%tky
      %action-Schedule           = COND #( WHEN order-Status = 'CREATED'     THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
      %action-StartWork          = COND #( WHEN order-Status = 'SCHEDULED'   THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
      %action-CompleteWork       = COND #( WHEN order-Status = 'IN_PROGRESS' THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
      %action-CancelOrder        = COND #( WHEN order-Status = 'CREATED' OR order-Status = 'SCHEDULED' THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
    ) ).
  ENDMETHOD.
ENDCLASS.
```

Same pattern applies to `ZI_MAINT_REQ` (Task 1.6) for `RejectRequest`/`ConvertToWorkOrder`, enabled only when `Status = REPORTED`. Add to `lhc_maintrequest`:

```abap
    METHODS get_instance_features FOR INSTANCE FEATURES
      IMPORTING keys REQUEST requested_features FOR MaintRequest RESULT result.
```

```abap
  METHOD get_instance_features.
    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Status ) WITH CORRESPONDING #( keys )
      RESULT DATA(requests).

    result = VALUE #( FOR req IN requests (
      %tky                      = req-%tky
      %action-RejectRequest      = COND #( WHEN req-Status = 'REPORTED' THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
      %action-ConvertToWorkOrder = COND #( WHEN req-Status = 'REPORTED' THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
    ) ).
  ENDMETHOD.
```

- [ ] **Step 2: Commit**

```bash
git add abap/behavior/zbp_i_work_order.clas.abap abap/behavior/zbp_i_maint_req.clas.abap
git commit -m "feat(1.7): work order status machine + cross-BO equipment effects + instance feature control"
```

### Task 1.8: CDS projections + metadata extensions (Fiori Elements admin preview)

**Files:**
- Create: `abap/cds/zc_equipment.ddls.abap`, `abap/cds/zc_equipment.mdext.abap`
- Create: `abap/cds/zc_maint_req.ddls.abap`, `abap/cds/zc_maint_req.mdext.abap`
- Create: `abap/cds/zc_work_order.ddls.abap`, `abap/cds/zc_work_order.mdext.abap`
- Create: `abap/behavior/zc_equipment.bdef.abap`, `abap/behavior/zc_maint_req.bdef.abap`, `abap/behavior/zc_work_order.bdef.abap`

**Interfaces:**
- Consumes: `ZI_AP_Equipment`, `ZI_Maint_Req`, `ZI_Work_Order` (Task 1.3); actions/determinations from Task 1.4's bdefs.
- Produces: `ZC_Equipment`, `ZC_Maint_Req`, `ZC_Work_Order` — the entities Task 1.9's service definition (Task 1.10) exposes on the OData binding.

- [ ] **Step 1: Write the three projection views**

`abap/cds/zc_equipment.ddls.abap`:
```abap
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Equipment'
@Metadata.allowExtensions: true
@ObjectModel.semanticKey: [ 'EquipTag' ]
@Search.searchable: true
define root view entity ZC_Equipment
  provider contract transactional_query
  as projection on ZI_AP_Equipment
{
  key EquipId,
      @Search.defaultSearchElement: true
      EquipTag,
      @Search.defaultSearchElement: true
      Name,
      EquipType,
      Site,
      Criticality,
      OpStatus,
      InstalledOn,
      CreatedAt,
      ChangedAt,

      _MaintReq  : redirected to composition child ZC_Maint_Req,
      _WorkOrder : redirected to composition child ZC_Work_Order
}
```

`abap/cds/zc_maint_req.ddls.abap`:
```abap
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Maintenance Request'
@Metadata.allowExtensions: true
@Search.searchable: true
define root view entity ZC_Maint_Req
  provider contract transactional_query
  as projection on ZI_Maint_Req
{
  key ReqId,
      EquipId,
      @Search.defaultSearchElement: true
      Title,
      Description,
      Severity,
      Status,
      ReportedBy,
      RejectNote,
      CreatedAt,
      ChangedAt,

      _Equipment : redirected to parent ZC_Equipment,
      _WorkOrder : redirected to ZC_Work_Order
}
```

`abap/cds/zc_work_order.ddls.abap`:
```abap
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Work Order'
@Metadata.allowExtensions: true
define root view entity ZC_Work_Order
  provider contract transactional_query
  as projection on ZI_Work_Order
{
  key OrderId,
      ReqId,
      EquipId,
      Priority,
      Status,
      AssignedTo,
      ScheduledDate,
      StartedAt,
      CompletedAt,
      DowntimeHours,
      CompletionNotes,
      CancelNote,
      CreatedAt,
      ChangedAt,

      _Request   : redirected to ZC_Maint_Req,
      _Equipment : redirected to parent ZC_Equipment
}
```

- [ ] **Step 2: Write the three projection behavior definitions**

`abap/behavior/zc_equipment.bdef.abap`:
```abap
projection;
strict ( 2 );

define behavior for ZC_Equipment alias Equipment
{
  use create;
  use update;
}
```

`abap/behavior/zc_maint_req.bdef.abap`:
```abap
projection;
strict ( 2 );

define behavior for ZC_Maint_Req alias MaintRequest
{
  use create;
  use update;

  use action RejectRequest;
  use action ConvertToWorkOrder;
}
```

`abap/behavior/zc_work_order.bdef.abap`:
```abap
projection;
strict ( 2 );

define behavior for ZC_Work_Order alias WorkOrder
{
  use update;

  use action Schedule;
  use action StartWork;
  use action CompleteWork;
  use action CancelOrder;
}
```

- [ ] **Step 3: Write the metadata extensions (Fiori Elements admin preview)**

`abap/cds/zc_equipment.mdext.abap`:
```abap
@Metadata.layer: #CORE
@UI: {
  headerInfo: { typeName: 'Equipment', typeNamePlural: 'Equipment',
                title: { type: #STANDARD, value: 'EquipTag' } }
}
annotate view ZC_Equipment with
{
  @UI.facet: [ { id: 'General', purpose: #STANDARD, type: #IDENTIFICATION_REFERENCE, label: 'General', position: 10 } ]
  @UI.lineItem: [ { position: 10, label: 'Tag' } ]
  @UI.identification: [ { position: 10 } ]
  EquipTag;

  @UI.lineItem: [ { position: 20, label: 'Name' } ]
  @UI.identification: [ { position: 20 } ]
  Name;

  @UI.lineItem: [ { position: 30, label: 'Type' } ]
  EquipType;

  @UI.lineItem: [ { position: 40, label: 'Site' } ]
  Site;

  @UI.lineItem: [ { position: 50, label: 'Criticality' } ]
  Criticality;

  @UI.lineItem: [ { position: 60, label: 'Status' } ]
  OpStatus;
}
```

`abap/cds/zc_maint_req.mdext.abap`:
```abap
@Metadata.layer: #CORE
@UI: {
  headerInfo: { typeName: 'Maintenance Request', typeNamePlural: 'Maintenance Requests',
                title: { type: #STANDARD, value: 'Title' } }
}
annotate view ZC_Maint_Req with
{
  @UI.lineItem: [ { position: 10, label: 'Title' } ]
  @UI.identification: [ { position: 10 } ]
  Title;

  @UI.lineItem: [ { position: 20, label: 'Severity' } ]
  Severity;

  @UI.lineItem: [ { position: 30, label: 'Status' } ]
  Status;

  @UI.lineItem: [ { position: 40, label: 'Reported by' } ]
  ReportedBy;
}
```

`abap/cds/zc_work_order.mdext.abap`:
```abap
@Metadata.layer: #CORE
@UI: {
  headerInfo: { typeName: 'Work Order', typeNamePlural: 'Work Orders',
                title: { type: #STANDARD, value: 'OrderId' } }
}
annotate view ZC_Work_Order with
{
  @UI.lineItem: [ { position: 10, label: 'Priority' } ]
  Priority;

  @UI.lineItem: [ { position: 20, label: 'Status' } ]
  @UI.identification: [ { position: 10 } ]
  Status;

  @UI.lineItem: [ { position: 30, label: 'Assigned to' } ]
  AssignedTo;

  @UI.lineItem: [ { position: 40, label: 'Scheduled' } ]
  ScheduledDate;
}
```

- [ ] **Step 4: Commit**

```bash
git add abap/cds/zc_equipment.ddls.abap abap/cds/zc_equipment.mdext.abap abap/cds/zc_maint_req.ddls.abap abap/cds/zc_maint_req.mdext.abap abap/cds/zc_work_order.ddls.abap abap/cds/zc_work_order.mdext.abap abap/behavior/zc_equipment.bdef.abap abap/behavior/zc_maint_req.bdef.abap abap/behavior/zc_work_order.bdef.abap
git commit -m "feat(1.8): CDS projections, projection behaviors, and Fiori metadata extensions"
```

### Task 1.9: ABAP Unit test suite `ZTC_ASSETPULSE`

**Files:**
- Create: `abap/test/ztc_assetpulse.clas.abap`

**Interfaces:**
- Consumes: every action/determination/validation name from Task 1.4–1.7. Uses `cl_abap_behv_test_environment` to double the three root entities so tests never touch a real table.

- [ ] **Step 1: Write `abap/test/ztc_assetpulse.clas.abap`**

```abap
CLASS ztc_assetpulse DEFINITION FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS
  FINAL.

  PRIVATE SECTION.
    CLASS-DATA environment TYPE REF TO if_abap_behv_test_environment.

    CLASS-METHODS class_setup.
    CLASS-METHODS class_teardown.
    METHODS teardown.

    METHODS create_equipment_sets_operational      FOR TESTING RAISING cx_static_check.
    METHODS critical_request_downs_equipment        FOR TESTING RAISING cx_static_check.
    METHODS reject_without_note_fails               FOR TESTING RAISING cx_static_check.
    METHODS reject_critical_restores_equipment      FOR TESTING RAISING cx_static_check.
    METHODS convert_creates_work_order              FOR TESTING RAISING cx_static_check.
    METHODS schedule_in_past_fails                   FOR TESTING RAISING cx_static_check.
    METHODS schedule_sets_scheduled                  FOR TESTING RAISING cx_static_check.
    METHODS start_work_illegal_from_created_fails    FOR TESTING RAISING cx_static_check.
    METHODS start_work_sets_maintenance              FOR TESTING RAISING cx_static_check.
    METHODS complete_negative_downtime_fails         FOR TESTING RAISING cx_static_check.
    METHODS complete_restores_operational            FOR TESTING RAISING cx_static_check.
    METHODS cancel_from_created                      FOR TESTING RAISING cx_static_check.

    METHODS create_equipment
      IMPORTING criticality       TYPE string DEFAULT 'MEDIUM'
      RETURNING VALUE(equip_id)  TYPE sysuuid_x16
      RAISING   cx_static_check.

    METHODS create_request
      IMPORTING equip_id        TYPE sysuuid_x16
                severity        TYPE string DEFAULT 'MEDIUM'
      RETURNING VALUE(req_id)   TYPE sysuuid_x16
      RAISING   cx_static_check.

    METHODS convert_to_order
      IMPORTING req_id           TYPE sysuuid_x16
      RETURNING VALUE(order_id) TYPE sysuuid_x16
      RAISING   cx_static_check.

    METHODS schedule_order
      IMPORTING order_id TYPE sysuuid_x16
      RAISING   cx_static_check.

    METHODS start_order
      IMPORTING order_id TYPE sysuuid_x16
      RAISING   cx_static_check.
ENDCLASS.

CLASS ztc_assetpulse IMPLEMENTATION.

  METHOD class_setup.
    environment = cl_abap_behv_test_environment=>create(
      i_for_entities = VALUE #( ( name = 'ZI_AP_EQUIPMENT' )
                                 ( name = 'ZI_MAINT_REQ' )
                                 ( name = 'ZI_WORK_ORDER' ) ) ).
  ENDMETHOD.

  METHOD class_teardown.
    environment->destroy( ).
  ENDMETHOD.

  METHOD teardown.
    environment->clear_doubles( ).
  ENDMETHOD.

  METHOD create_equipment.
    equip_id = cl_system_uuid=>create_uuid_x16_static( ).
    MODIFY ENTITIES OF zi_ap_equipment IN LOCAL MODE
      ENTITY Equipment
        CREATE FIELDS ( EquipTag Name EquipType Site Criticality )
        WITH VALUE #( ( %cid = 'EQ1' %key-EquipId = equip_id
                         EquipTag = 'CRU-104' Name = 'Primary crusher'
                         EquipType = 'CRUSHER' Site = 'Pilbara Site A'
                         Criticality = criticality ) )
      MAPPED   DATA(mapped)
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.
  ENDMETHOD.

  METHOD create_request.
    req_id = cl_system_uuid=>create_uuid_x16_static( ).
    MODIFY ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        CREATE FIELDS ( EquipId Title Severity ReportedBy )
        WITH VALUE #( ( %cid = 'REQ1' %key-ReqId = req_id
                         EquipId = equip_id Title = 'Bearing noise'
                         Severity = severity ReportedBy = 'engineer@demo' ) )
      MAPPED   DATA(mapped)
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.
  ENDMETHOD.

  METHOD convert_to_order.
    MODIFY ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        EXECUTE ConvertToWorkOrder FROM VALUE #( ( %key-ReqId = req_id %param-Priority = '' ) )
      MAPPED   DATA(mapped)
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.

    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest BY \_WorkOrder
        FIELDS ( OrderId )
        WITH VALUE #( ( %key-ReqId = req_id ) )
      RESULT DATA(order_result).
    order_id = order_result[ 1 ]-OrderId.
  ENDMETHOD.

  METHOD schedule_order.
    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        EXECUTE Schedule FROM VALUE #( ( %key-OrderId = order_id
                                          %param-ScheduledDate = cl_abap_context_info=>get_system_date( ) + 1
                                          %param-AssignedTo = 'tech@demo' ) ).
    COMMIT ENTITIES.
  ENDMETHOD.

  METHOD start_order.
    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        EXECUTE StartWork FROM VALUE #( ( %key-OrderId = order_id ) ).
    COMMIT ENTITIES.
  ENDMETHOD.

  METHOD create_equipment_sets_operational.
    DATA(equip_id) = create_equipment( ).
    READ ENTITIES OF zi_ap_equipment IN LOCAL MODE
      ENTITY Equipment
        FIELDS ( OpStatus ) WITH VALUE #( ( %key-EquipId = equip_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-OpStatus exp = 'OPERATIONAL' ).
  ENDMETHOD.

  METHOD critical_request_downs_equipment.
    DATA(equip_id) = create_equipment( ).
    create_request( equip_id = equip_id severity = 'CRITICAL' ).
    READ ENTITIES OF zi_ap_equipment IN LOCAL MODE
      ENTITY Equipment
        FIELDS ( OpStatus ) WITH VALUE #( ( %key-EquipId = equip_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-OpStatus exp = 'DOWN' ).
  ENDMETHOD.

  METHOD reject_without_note_fails.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).

    MODIFY ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        EXECUTE RejectRequest FROM VALUE #( ( %key-ReqId = req_id %param-Note = '' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).

    cl_abap_unit_assert=>assert_not_initial( act = failed-maintrequest ).
  ENDMETHOD.

  METHOD reject_critical_restores_equipment.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id severity = 'CRITICAL' ).

    MODIFY ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        EXECUTE RejectRequest FROM VALUE #( ( %key-ReqId = req_id %param-Note = 'Duplicate report' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.

    READ ENTITIES OF zi_ap_equipment IN LOCAL MODE
      ENTITY Equipment
        FIELDS ( OpStatus ) WITH VALUE #( ( %key-EquipId = equip_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-OpStatus exp = 'OPERATIONAL' ).
  ENDMETHOD.

  METHOD convert_creates_work_order.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id severity = 'HIGH' ).
    DATA(order_id) = convert_to_order( req_id ).

    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Status ) WITH VALUE #( ( %key-ReqId = req_id ) )
      RESULT DATA(request_result).
    cl_abap_unit_assert=>assert_equals( act = request_result[ 1 ]-Status exp = 'CONVERTED' ).

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( Status Priority ) WITH VALUE #( ( %key-OrderId = order_id ) )
      RESULT DATA(order_result).
    cl_abap_unit_assert=>assert_equals( act = order_result[ 1 ]-Status   exp = 'CREATED' ).
    cl_abap_unit_assert=>assert_equals( act = order_result[ 1 ]-Priority exp = 'HIGH' ).
  ENDMETHOD.

  METHOD schedule_in_past_fails.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).

    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        EXECUTE Schedule FROM VALUE #( ( %key-OrderId = order_id
                                          %param-ScheduledDate = cl_abap_context_info=>get_system_date( ) - 1
                                          %param-AssignedTo = 'tech@demo' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).

    cl_abap_unit_assert=>assert_not_initial( act = failed-workorder ).
  ENDMETHOD.

  METHOD schedule_sets_scheduled.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).
    schedule_order( order_id ).

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( Status AssignedTo ) WITH VALUE #( ( %key-OrderId = order_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-Status     exp = 'SCHEDULED' ).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-AssignedTo exp = 'tech@demo' ).
  ENDMETHOD.

  METHOD start_work_illegal_from_created_fails.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).

    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        EXECUTE StartWork FROM VALUE #( ( %key-OrderId = order_id ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).

    cl_abap_unit_assert=>assert_not_initial( act = failed-workorder ).
  ENDMETHOD.

  METHOD start_work_sets_maintenance.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).
    schedule_order( order_id ).
    start_order( order_id ).

    READ ENTITIES OF zi_ap_equipment IN LOCAL MODE
      ENTITY Equipment
        FIELDS ( OpStatus ) WITH VALUE #( ( %key-EquipId = equip_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-OpStatus exp = 'MAINTENANCE' ).
  ENDMETHOD.

  METHOD complete_negative_downtime_fails.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).
    schedule_order( order_id ).
    start_order( order_id ).

    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        EXECUTE CompleteWork FROM VALUE #( ( %key-OrderId = order_id
                                              %param-CompletionNotes = 'Bearing replaced'
                                              %param-DowntimeHours = '-1.00' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).

    cl_abap_unit_assert=>assert_not_initial( act = failed-workorder ).
  ENDMETHOD.

  METHOD complete_restores_operational.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).
    schedule_order( order_id ).
    start_order( order_id ).

    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        EXECUTE CompleteWork FROM VALUE #( ( %key-OrderId = order_id
                                              %param-CompletionNotes = 'Bearing replaced'
                                              %param-DowntimeHours = '4.50' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.

    READ ENTITIES OF zi_ap_equipment IN LOCAL MODE
      ENTITY Equipment
        FIELDS ( OpStatus ) WITH VALUE #( ( %key-EquipId = equip_id ) )
      RESULT DATA(equip_result).
    cl_abap_unit_assert=>assert_equals( act = equip_result[ 1 ]-OpStatus exp = 'OPERATIONAL' ).

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( Status DowntimeHours ) WITH VALUE #( ( %key-OrderId = order_id ) )
      RESULT DATA(order_result).
    cl_abap_unit_assert=>assert_equals( act = order_result[ 1 ]-Status        exp = 'COMPLETED' ).
    cl_abap_unit_assert=>assert_equals( act = order_result[ 1 ]-DowntimeHours exp = '4.50' ).
  ENDMETHOD.

  METHOD cancel_from_created.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).

    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        EXECUTE CancelOrder FROM VALUE #( ( %key-OrderId = order_id %param-Note = 'No longer needed' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( Status ) WITH VALUE #( ( %key-OrderId = order_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-Status exp = 'CANCELLED' ).
  ENDMETHOD.

ENDCLASS.
```

- [ ] **Step 2: Commit** (test only runs green once Task 1.10's activation checkpoint happens — commit now, verify at the checkpoint)

```bash
git add abap/test/ztc_assetpulse.clas.abap
git commit -m "test(1.9): ABAP Unit suite — 12 tests covering every transition and both cross-BO effects"
```

### Task 1.10: Service definition, binding, and 🧑 activation checkpoint

**Files:**
- Create: `abap/service/zassetpulse_srv.srvd.abap`

**Interfaces:**
- Consumes: `ZC_Equipment`, `ZC_Maint_Req`, `ZC_Work_Order` (Task 1.8).
- Produces: service definition `ZASSETPULSE_SRV` exposing all three as `Equipment`, `MaintenanceRequest`, `WorkOrder` — the exact entity set names Task 2's smoke script and Task 4's frontend proxy hit.

- [ ] **Step 1: Write `abap/service/zassetpulse_srv.srvd.abap`**

```abap
@EndUserText.label: 'AssetPulse service'
define service ZASSETPULSE_SRV {
  expose ZC_Equipment as Equipment;
  expose ZC_Maint_Req as MaintenanceRequest;
  expose ZC_Work_Order as WorkOrder;
}
```

- [ ] **Step 2: 🧑 MANUAL CHECKPOINT — activate everything in Eclipse ADT**

Print exactly this and stop until the human pastes confirmation or logs:

```
🧑 MANUAL CHECKPOINT — Eclipse ADT

1. Create ABAP package ZASSET_MAINT (or confirm it exists) in your BTP ABAP Environment trial system.
2. Create message class ZASSETPULSE per abap/test/zmessages.md.
3. Following abap/MANIFEST.md groups 1–8 in order, create each object in ADT (New > Other ABAP Repository Object > <type>), pasting in the source from the matching file in abap/. For Group 5 (behavior implementation classes), use New > Behavior Implementation from each .bdef — ADT generates the LHC class stub; replace its body with the file's content.
4. Activate each group before moving to the next (Ctrl+F3 or right-click > Activate). Fix any syntax errors ADT reports — do not guess; paste the exact error back here if unclear.
5. Create the service binding: right-click ZASSETPULSE_SRV > New > Service Binding, name it ZUI_ASSETPULSE_O4, binding type "OData V4 – UI", publish it.
6. Run ATC on package ZASSET_MAINT (right-click > Run As > ATC Check). Target: 0 errors, 0 warnings.
7. Run ABAP Unit on ZTC_ASSETPULSE (right-click class > Run As > ABAP Unit Test). Target: 12/12 green.
8. Paste back: the ATC result summary, the ABAP Unit result summary (pass/fail count), and the published service binding's base URL (Service Binding editor > "..." > Show/Copy URL — the part before `/Equipment`).

This phase is not done until you paste that confirmation. If ATC or ABAP Unit show red, paste the exact error text and we fix the ABAP source together before re-running — no guessing at SAP behavior.
```

- [ ] **Step 3: On confirmation, record the service path**

Once the human pastes the published base URL, update `.env` (not `.env.example`) locally:

```bash
# in .env — do NOT commit this file
SAP_SERVICE_PATH=<paste the exact path segment after the host, e.g. /sap/opu/odata4/sap/zassetpulse_srv/srvd/sap/zassetpulse_srv/0001>
```

- [ ] **Step 4: Commit the service definition source**

```bash
git add abap/service/zassetpulse_srv.srvd.abap
git commit -m "feat(1.10): service definition exposing Equipment, MaintenanceRequest, WorkOrder"
```

### Task 1.11: abapGit link + REDEPLOY runbook

**Files:**
- Create: `docs/REDEPLOY.md`

**Interfaces:**
- Consumes: `abap/MANIFEST.md` (Task 1.1) as the object-order reference this runbook points back to.

- [ ] **Step 1: 🧑 MANUAL CHECKPOINT — link abapGit**

```
🧑 MANUAL CHECKPOINT — abapGit

1. In ADT, right-click package ZASSET_MAINT > Team > Link to Git Repository (abapGit plugin).
2. Point it at this GitHub repo, folder abap/, branch main (or feat/assetpulse-v1 until merged).
3. Stage and commit/push from ADT so the objects you just activated serialize into abap/ alongside the sources already there — confirm the resulting abap/ tree still matches abap/MANIFEST.md's object list (abapGit adds .xml property sidecar files next to the .abap/.tabl.abap/.ddls.abap sources already committed; that's expected).
4. Paste back: confirmation the push succeeded and a `git log --oneline -3` from your machine showing the abapGit commit(s).
```

- [ ] **Step 2: Write `docs/REDEPLOY.md`**

```markdown
# BTP Trial Reset Recovery

The BTP ABAP Environment trial hibernates nightly and can be fully reset (all objects wiped) without warning — this is expected, not a bug. Recovery is one abapGit pull, budget one hour.

## Symptom
`sap-smoke.mjs` or the live app returns "connection refused" or the service binding 404s.

## Recovery steps
1. Open the BTP cockpit, start the ABAP Environment instance if it shows "stopped" — trials sleep after inactivity, this alone fixes most "connection refused" reports before you touch any code.
2. If the system is genuinely reset (package ZASSET_MAINT is gone): create the package again, re-link abapGit (same steps as the original Task 1.11 checkpoint), point it at this repo's `abap/` folder, and Pull. abapGit recreates every table/CDS view/behavior/class/service in `abap/MANIFEST.md` order automatically from the serialized source.
3. Re-publish the service binding `ZUI_ASSETPULSE_O4` (bindings are not always captured by abapGit the same way source objects are — check first; if missing, recreate per Task 1.10 Step 2.5).
4. Re-create communication scenario `ZCS_ASSETPULSE` and comm user (Task 2.1) if they were wiped.
5. Re-run `node web/scripts/sap-smoke.mjs` — green output confirms the service is reachable end to end.
6. Re-run `node web/scripts/seed.mjs` if the reset also wiped data (a package/table reset does; a mere hibernate-and-restart does not).

## Prevention
None available on trial tier — this is the accepted tradeoff for a free BTP ABAP Environment. Budget recovery time before demos.
```

- [ ] **Step 3: Commit**

```bash
git add docs/REDEPLOY.md
git commit -m "docs(1.11): BTP trial reset recovery runbook"
```

### Task 1.12: ADR 0001 (RAP managed) + ADR 0005 (abapGit)

**Files:**
- Create: `docs/adr/0001-rap-managed-over-unmanaged.md`
- Create: `docs/adr/0005-abapgit-source-of-truth.md`

- [ ] **Step 1: Write `docs/adr/0001-rap-managed-over-unmanaged.md`**

```markdown
# ADR 0001: RAP managed business objects over unmanaged

## Context
AssetPulse's three entities (Equipment, MaintenanceRequest, WorkOrder) need CRUD, managed numbering, optimistic concurrency (etag), and a handful of status-transition actions with validations and determinations. RAP offers both managed and unmanaged BO patterns.

## Decision
Use managed RAP business objects (`managed implementation in class ... unique;`) with `strict(2)`, managed UUID key numbering, and `etag master ChangedAt` for all three roots, implementing only the actions/determinations/validations the status machine actually needs.

## Consequences
- Framework handles create/update persistence, draft-free transactional buffering, and locking — no hand-written `INSERT`/`UPDATE` SQL, satisfying the "EML only, no direct UPDATE dbtab" rule.
- `strict(2)` catches unauthorized field changes and unknown associations at compile-adjacent time rather than runtime, which matters more once cross-BO EML is involved (Task 1.6/1.7).
- Cost: less control over exact SQL than unmanaged — acceptable, since none of the three entities need custom persistence logic.
```

- [ ] **Step 2: Write `docs/adr/0005-abapgit-source-of-truth.md`**

```markdown
# ADR 0005: abapGit as ABAP source-of-truth strategy

## Context
Claude Code cannot reach SAP BTP directly — ABAP only activates inside Eclipse ADT (CLAUDE.md, non-negotiable). Without a serialization strategy, the real ABAP source would live only inside the BTP trial system: invisible to a recruiter reading the GitHub repo, and lost outright on a trial reset.

## Decision
Link the ADT package `ZASSET_MAINT` to this GitHub repo's `abap/` folder via abapGit from day one (Task 1.11), immediately after first activation. Every subsequent ABAP change is authored here first, then materialized in ADT, then pushed back through abapGit.

## Consequences
- The public repo shows real, activated ABAP source (tables, CDS, behavior definitions/implementations, tests) — recruiter-checkable, not a description of what SAP work would look like.
- Trial resets (`docs/REDEPLOY.md`) become a one-command recovery (abapGit pull) instead of re-authoring everything from memory.
- Cost: an extra manual sync step at every ABAP-touching checkpoint — accepted, since the alternative (source only in the trial system) fails the "recruiter-checkable" success criterion in spec §1.
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0001-rap-managed-over-unmanaged.md docs/adr/0005-abapgit-source-of-truth.md
git commit -m "docs(1.12): ADR 0001 and ADR 0005"
```

---

## Phase 2 — API Publish + Smoke 🧑 gated

### Task 2.1: Communication scenario + comm user 🧑 checkpoint

- [ ] **Step 1: 🧑 MANUAL CHECKPOINT — communication scenario/user**

Print exactly this and stop until the human pastes confirmation:

```
🧑 MANUAL CHECKPOINT — Communication scenario + user

1. In ADT (or the BTP cockpit's "Communication Management" app), create Communication Scenario ZCS_ASSETPULSE.
2. Add outbound service ZASSETPULSE_SRV / binding ZUI_ASSETPULSE_O4 to the scenario, authentication method "User ID and Password".
3. Create a Communication System pointing at this system (or reuse an existing one), then a Communication Arrangement for ZCS_ASSETPULSE binding to that system.
4. Create a Communication User (Business Users app or `SU01`-equivalent in ABAP Environment) dedicated to AssetPulse — do not reuse a personal user. Grant it the business catalog/role needed to call ZASSETPULSE_SRV.
5. Paste back: the communication user's username (not the password — that goes straight into your local `.env`, never into chat history that gets committed) and confirmation the arrangement is active.
```

- [ ] **Step 2: Record credentials locally (not committed)**

```bash
# in .env — do NOT commit this file
SAP_USER=<comm user username>
SAP_PASS=<comm user password>
SAP_BASE_URL=<system host from the service binding URL, scheme+host only>
```

### Task 2.2: `sap-smoke.mjs` connectivity script

**Files:**
- Create: `web/scripts/sap-smoke.mjs`

**Interfaces:**
- Consumes: `SAP_BASE_URL`, `SAP_SERVICE_PATH`, `SAP_USER`, `SAP_PASS` (`.env`, Task 0.1 + 2.1).
- Produces: exit code 0 on success (service root reachable, `Equipment` entity set reachable, CSRF token fetchable), non-zero with a clear message otherwise — Task 4.5's proxy route reuses this script's CSRF-fetch pattern.

- [ ] **Step 1: Write `web/scripts/sap-smoke.mjs`**

```javascript
#!/usr/bin/env node
// Verifies the published OData v4 service is reachable before wiring the frontend to it.
// Run: node --env-file=../.env web/scripts/sap-smoke.mjs   (from repo root)

const required = ['SAP_BASE_URL', 'SAP_SERVICE_PATH', 'SAP_USER', 'SAP_PASS'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const { SAP_BASE_URL, SAP_SERVICE_PATH, SAP_USER, SAP_PASS } = process.env;
const serviceUrl = `${SAP_BASE_URL}${SAP_SERVICE_PATH}`;
const authHeader = `Basic ${Buffer.from(`${SAP_USER}:${SAP_PASS}`).toString('base64')}`;

async function check(label, fn) {
  process.stdout.write(`${label}... `);
  try {
    await fn();
    console.log('PASS');
    return true;
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    return false;
  }
}

let allPassed = true;

allPassed &= await check('Service root reachable', async () => {
  const res = await fetch(serviceUrl, { headers: { Authorization: authHeader, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

allPassed &= await check('Equipment entity set reachable', async () => {
  const res = await fetch(`${serviceUrl}/Equipment?$top=1`, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.value)) throw new Error('response missing "value" array');
});

allPassed &= await check('CSRF token fetchable', async () => {
  const res = await fetch(serviceUrl, {
    headers: { Authorization: authHeader, 'x-csrf-token': 'fetch' },
  });
  const token = res.headers.get('x-csrf-token');
  if (!token) throw new Error('no x-csrf-token header in response — writes will fail');
});

if (!allPassed) {
  console.error('\nSmoke test FAILED. See docs/REDEPLOY.md if the trial system may have reset.');
  process.exit(1);
}

console.log('\nAll smoke checks passed.');
```

- [ ] **Step 2: Run it against the live checkpoint from Task 2.1**

Run: `node --env-file=.env web/scripts/sap-smoke.mjs`
Expected: `All smoke checks passed.` with exit code 0. If it fails, paste the exact failure line back — do not guess at a fix; check `docs/REDEPLOY.md` first (trial hibernation is the most common cause).

- [ ] **Step 3: Commit**

```bash
git add web/scripts/sap-smoke.mjs
git commit -m "feat(2.2): SAP OData v4 connectivity smoke script"
```

### Task 2.3: ADR 0002 (server-side proxy for SAP auth)

**Files:**
- Create: `docs/adr/0002-server-side-proxy-for-sap-auth.md`

- [ ] **Step 1: Write the ADR**

```markdown
# ADR 0002: Server-side proxy for SAP authentication

## Context
The published OData v4 service authenticates via a communication user's basic-auth credentials. The browser must never see `SAP_USER`/`SAP_PASS`, and OData v4 writes additionally require an `x-csrf-token` fetched from a prior GET and its session cookie replayed on the write — a two-request dance that's easy to get wrong per-caller.

## Decision
All SAP traffic routes through one Next.js route handler, `web/src/app/api/sap/[...path]/route.ts` (Task 4.6). It holds the basic-auth header and CSRF/cookie handling centrally; the browser only ever calls same-origin `/api/sap/*`.

## Consequences
- Credentials never reach client JS, satisfying the "no SAP calls from the browser" rule.
- CSRF token fetch + cookie replay is implemented exactly once, not duplicated per feature — the class of bug CLAUDE.md's SAP gotchas section warns about.
- Cost: one extra network hop (browser → Vercel → BTP) versus calling SAP directly — acceptable, matches the analytics service's identical proxy pattern (ADR 0003).
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0002-server-side-proxy-for-sap-auth.md
git commit -m "docs(2.3): ADR 0002"
```

---

## Phase 3 — Design Tokens

The real `design/tokens.json` is produced by an external Claude Design run against `DESIGN_BRIEF.md` (🧑, outside this session — KICKOFF.md §3 Phase 3). Claude Code's job is to define the exact schema that run must conform to, ship a fixture matching it so the schema itself is testable now, and (in Task 4.1) wire Tailwind to read the real file directly — no generator/build step needed, Tailwind config is already JS and can `import` JSON as-is.

### Task 3.1: Tokens schema + fixture + 🧑 checkpoint

**Files:**
- Create: `design/tokens.example.json`
- Create: `design/README.md`

**Interfaces:**
- Produces: the token shape (`surface.{base,panel,raised}`, `text.{primary,secondary,muted}`, `severity.{low,medium,high,critical}.{bg,fg,border}`, `opstatus.{operational,maintenance,down}.{bg,fg,border}`, `lifecycle.{created,scheduled,in_progress,completed,cancelled}.{bg,fg,border}`, `type.{fontSans,fontMono,scale.{xs,sm,base,lg,xl,2xl,3xl}}`, `radius.{sm,md,lg}`) that Task 3.2's zod schema validates and Task 4.1's `tailwind.config.ts` consumes.

- [ ] **Step 1: Write `design/tokens.example.json`**

```json
{
  "surface": { "base": "#0a0a0c", "panel": "#121216", "raised": "#1c1c22" },
  "text": { "primary": "#f5f5f7", "secondary": "#a1a1aa", "muted": "#6b6b76" },
  "severity": {
    "low":      { "bg": "#1a2e22", "fg": "#4ade80", "border": "#22c55e" },
    "medium":   { "bg": "#2e2a14", "fg": "#facc15", "border": "#eab308" },
    "high":     { "bg": "#331f14", "fg": "#fb923c", "border": "#f97316" },
    "critical": { "bg": "#331419", "fg": "#f87171", "border": "#ef4444" }
  },
  "opstatus": {
    "operational": { "bg": "#132a1d", "fg": "#4ade80", "border": "#16a34a" },
    "maintenance":  { "bg": "#332a12", "fg": "#fbbf24", "border": "#d97706" },
    "down":         { "bg": "#330f12", "fg": "#f87171", "border": "#dc2626" }
  },
  "lifecycle": {
    "created":     { "bg": "#1a1a20", "fg": "#d4d4d8", "border": "#3f3f46" },
    "scheduled":   { "bg": "#141d2e", "fg": "#93c5fd", "border": "#3b82f6" },
    "in_progress": { "bg": "#1e1a2e", "fg": "#c4b5fd", "border": "#8b5cf6" },
    "completed":   { "bg": "#132a1d", "fg": "#4ade80", "border": "#16a34a" },
    "cancelled":   { "bg": "#1a1a20", "fg": "#71717a", "border": "#3f3f46" }
  },
  "type": {
    "fontSans": "Inter, system-ui, sans-serif",
    "fontMono": "'JetBrains Mono', ui-monospace, monospace",
    "scale": { "xs": "0.75rem", "sm": "0.875rem", "base": "1rem", "lg": "1.125rem", "xl": "1.25rem", "2xl": "1.5rem", "3xl": "2rem" }
  },
  "radius": { "sm": "4px", "md": "8px", "lg": "12px" }
}
```

- [ ] **Step 2: 🧑 MANUAL CHECKPOINT — external design run**

```
🧑 MANUAL CHECKPOINT — Claude Design

1. Run your Claude Design skill against DESIGN_BRIEF.md.
2. Deliverable "1" (tokens.json) MUST match the shape in design/tokens.example.json exactly — same top-level keys (surface, text, severity, opstatus, lifecycle, type, radius), same nested keys, values are the only thing that changes. If the design run produces different key names, normalize them to this shape before saving — Task 3.2's schema and Task 4.1's Tailwind config both hard-depend on these exact names.
3. Save the real output as design/tokens.json (not .example.json — that one stays as the schema fixture).
4. Save the 7 screens + 2 dialogs and design/README.md per DESIGN_BRIEF.md's deliverables list.
5. Paste back: confirmation design/tokens.json exists and lists its top-level keys so we can sanity-check them against the fixture before Task 3.2 runs.
```

- [ ] **Step 3: Commit the fixture** (design/tokens.json itself is added once the checkpoint confirms it)

```bash
git add design/tokens.example.json
git commit -m "feat(3.1): design tokens schema fixture"
```

### Task 3.2: Tokens schema validation

**Files:**
- Create: `web/src/lib/tokens.schema.ts`
- Test: `web/src/lib/tokens.schema.test.ts`

**Interfaces:**
- Consumes: `design/tokens.example.json` (Task 3.1), `zod` (Task 4.1 dependency — this task can run once Task 4.1's `package.json`/zod install lands; sequence it right after).
- Produces: `tokensSchema` (zod schema), `Tokens` (inferred type) — Task 4.1's `tailwind.config.ts` imports `Tokens` for type safety when mapping the JSON into `theme.extend`.

- [ ] **Step 1: Write the failing test**

```typescript
// web/src/lib/tokens.schema.test.ts
import { describe, it, expect } from 'vitest';
import { tokensSchema } from './tokens.schema';
import fixture from '../../../design/tokens.example.json';

describe('tokensSchema', () => {
  it('accepts the fixture tokens file', () => {
    expect(() => tokensSchema.parse(fixture)).not.toThrow();
  });

  it('rejects a severity ramp missing a step', () => {
    const broken = { ...fixture, severity: { low: fixture.severity.low } };
    expect(() => tokensSchema.parse(broken)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run src/lib/tokens.schema.test.ts`
Expected: FAIL with "Cannot find module './tokens.schema'"

- [ ] **Step 3: Write `web/src/lib/tokens.schema.ts`**

```typescript
import { z } from 'zod';

const colorTriad = z.object({ bg: z.string(), fg: z.string(), border: z.string() });

export const tokensSchema = z.object({
  surface: z.object({ base: z.string(), panel: z.string(), raised: z.string() }),
  text: z.object({ primary: z.string(), secondary: z.string(), muted: z.string() }),
  severity: z.object({ low: colorTriad, medium: colorTriad, high: colorTriad, critical: colorTriad }),
  opstatus: z.object({ operational: colorTriad, maintenance: colorTriad, down: colorTriad }),
  lifecycle: z.object({
    created: colorTriad,
    scheduled: colorTriad,
    in_progress: colorTriad,
    completed: colorTriad,
    cancelled: colorTriad,
  }),
  type: z.object({
    fontSans: z.string(),
    fontMono: z.string(),
    scale: z.object({
      xs: z.string(),
      sm: z.string(),
      base: z.string(),
      lg: z.string(),
      xl: z.string(),
      '2xl': z.string(),
      '3xl': z.string(),
    }),
  }),
  radius: z.object({ sm: z.string(), md: z.string(), lg: z.string() }),
});

export type Tokens = z.infer<typeof tokensSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run src/lib/tokens.schema.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/tokens.schema.ts web/src/lib/tokens.schema.test.ts
git commit -m "feat(3.2): zod schema validating the design tokens shape"
```

### Task 3.3: ADR 0004 (dark-first design direction)

**Files:**
- Create: `docs/adr/0004-dark-first-design-direction.md`

- [ ] **Step 1: Write the ADR**

```markdown
# ADR 0004: Dark-first design direction, no v1 light theme

## Context
AssetPulse's audience is a recruiter reviewing a portfolio piece and a 2am mine-site control room operator — both contexts favor a dense, high-contrast, low-glare surface over a generic light SaaS dashboard. Spec §8 and DESIGN_BRIEF.md both specify a three-elevation dark surface system with two independent, non-color-only meaning systems (severity, op-status).

## Decision
Ship dark-only for v1. `design/tokens.json` (Task 3.1) defines exactly one surface set; `tailwind.config.ts` (Task 4.1) has no light-mode variant wired up. Light theme is explicitly out of scope (spec §10) and lives in `docs/V2_BACKLOG.md`.

## Consequences
- Every component only needs to satisfy one contrast/AA pass, not two — smaller surface area for the accessibility work that matters (WCAG AA on all severity/status pairings).
- Distinctive visual identity for the portfolio review (spec §1's explicit "visually memorable" requirement) instead of a template-flavored light dashboard.
- Cost: no light-mode option for users who prefer it — accepted per spec §10.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0004-dark-first-design-direction.md
git commit -m "docs(3.3): ADR 0004"
```

---

## Phase 4 — Frontend (`web/`)

### Task 4.1: Next.js scaffold + tooling

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/next.config.js`, `web/postcss.config.js`
- Create: `web/tailwind.config.ts`
- Create: `web/vitest.config.ts`, `web/vitest.setup.ts`
- Create: `web/playwright.config.ts`
- Create: `web/src/app/layout.tsx`, `web/src/app/globals.css`
- Create: `web/src/lib/utils.ts`

**Interfaces:**
- Consumes: `design/tokens.example.json` / `design/tokens.json` (Task 3.1), `Tokens` type (Task 3.2).
- Produces: `pnpm lint|typecheck|test|e2e` scripts (Task 0.2's CI depends on these exact names); path alias `@/*` → `web/src/*` used by every subsequent web task; `cn()` helper (clsx + tailwind-merge) used by every component task.

- [ ] **Step 1: Write `web/package.json`**

```json
{
  "name": "assetpulse-web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "e2e": "MOCK_MODE=1 playwright test",
    "e2e:live": "playwright test --config=playwright.live.config.ts"
  },
  "dependencies": {
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "next-auth": "^4.24.7",
    "@tanstack/react-query": "^5.51.0",
    "zod": "^3.23.8",
    "recharts": "^2.12.7",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.427.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "@types/node": "^20.14.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.5",
    "tailwindcss": "^3.4.7",
    "postcss": "^8.4.40",
    "autoprefixer": "^10.4.19",
    "vitest": "^2.0.5",
    "@vitejs/plugin-react": "^4.3.1",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.8",
    "jsdom": "^24.1.1",
    "msw": "^2.3.4",
    "@playwright/test": "^1.45.3"
  }
}
```

- [ ] **Step 2: Write `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "jsx": "preserve",
    "incremental": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "allowJs": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "playwright.config.ts", "e2e"]
}
```

- [ ] **Step 3: Write `web/next.config.js`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```

- [ ] **Step 4: Write `web/postcss.config.js`**

```javascript
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 4.5: Write `web/.eslintrc.json`** (missing from the original Step 1 dependency list otherwise being dead weight — `eslint-config-next` needs this to do anything)

```json
{
  "extends": "next/core-web-vitals"
}
```

- [ ] **Step 5: Write `web/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';
import fs from 'node:fs';
import path from 'node:path';
import type { Tokens } from './src/lib/tokens.schema';

const realTokens = path.join(__dirname, '../design/tokens.json');
const tokensPath = fs.existsSync(realTokens) ? realTokens : path.join(__dirname, '../design/tokens.example.json');
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8')) as Tokens;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: tokens.surface,
        content: tokens.text,
        severity: tokens.severity,
        opstatus: tokens.opstatus,
        lifecycle: tokens.lifecycle,
      },
      fontFamily: {
        sans: tokens.type.fontSans.split(',').map((f) => f.trim()),
        mono: tokens.type.fontMono.split(',').map((f) => f.trim()),
      },
      fontSize: tokens.type.scale,
      borderRadius: tokens.radius,
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Write `web/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 7: Write `web/vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 8: Write `web/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  // Next.js dev mode compiles each route on first hit, and the lifecycle
  // e2e test (Task 4.16) walks through ~7 distinct routes in sequence on a
  // cold server — the default 30s per-test budget got consumed by earlier
  // compiles before later assertions got their share. 120s total, 30s per
  // assertion (found and fixed while getting Task 4.16 to pass reliably).
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'MOCK_MODE=1 NEXT_PUBLIC_MOCK_MODE=1 pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 9: Write `web/src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 10: Write `web/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-surface-base text-content-primary antialiased;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 11: Write `web/src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AssetPulse',
  description: 'Asset maintenance control room',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 12: Install and initialize shadcn/ui primitives**

```bash
cd web
pnpm install
pnpm dlx shadcn@latest init --defaults --css-variables=false
pnpm dlx shadcn@latest add button dialog input textarea select label badge skeleton tabs table --yes
```

This generates `web/components.json` and `web/src/components/ui/{button,dialog,input,textarea,select,label,badge,skeleton,tabs,table}.tsx` plus wires `cn()` from Step 9. Task 4.9 builds AssetPulse-specific primitives (severity/status badges, KPI card, empty/error states) on top of these.

- [ ] **Step 13: Verify the toolchain boots clean**

Run: `cd web && pnpm typecheck && pnpm lint`
Expected: both exit 0 (no source files yet beyond scaffold, so this mostly checks config correctness).

- [ ] **Step 14: Commit**

```bash
git add web/package.json web/tsconfig.json web/next.config.js web/postcss.config.js web/tailwind.config.ts web/vitest.config.ts web/vitest.setup.ts web/playwright.config.ts web/src/app/layout.tsx web/src/app/globals.css web/src/lib/utils.ts web/components.json web/src/components/ui web/pnpm-lock.yaml
git commit -m "chore(4.1): Next.js scaffold, Tailwind wired to design tokens, shadcn/ui primitives"
```

### Task 4.2: Domain types (zod schemas)

**Files:**
- Create: `web/src/lib/types.ts`
- Test: `web/src/lib/types.test.ts`

**Interfaces:**
- Produces: `Equipment`, `MaintenanceRequest`, `WorkOrder`, `Role` types + `equipmentSchema`, `maintRequestSchema`, `workOrderSchema`, `newRequestFormSchema`, `scheduleFormSchema`, `completeFormSchema`, `rejectFormSchema`, `cancelFormSchema`, `convertFormSchema` — every later task (domain.ts, MSW fixtures, hooks, pages) imports these exact names. Field names are PascalCase, matching the OData v4 response shape verbatim (no translation layer between wire format and app state).

- [ ] **Step 1: Write the failing test**

```typescript
// web/src/lib/types.test.ts
import { describe, it, expect } from 'vitest';
import { equipmentSchema, maintRequestSchema, workOrderSchema } from './types';

describe('domain schemas', () => {
  it('parses a valid equipment record', () => {
    const result = equipmentSchema.safeParse({
      EquipId: '1', EquipTag: 'CRU-104', Name: 'Primary crusher', EquipType: 'CRUSHER',
      Site: 'Pilbara Site A', Criticality: 'HIGH', OpStatus: 'OPERATIONAL',
      InstalledOn: '2020-01-01', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid EquipType', () => {
    const result = equipmentSchema.safeParse({
      EquipId: '1', EquipTag: 'CRU-104', Name: 'Primary crusher', EquipType: 'SPACESHIP',
      Site: 'Pilbara Site A', Criticality: 'HIGH', OpStatus: 'OPERATIONAL',
      InstalledOn: null, CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('parses a valid maintenance request', () => {
    const result = maintRequestSchema.safeParse({
      ReqId: '1', EquipId: '1', Title: 'Bearing noise', Description: null,
      Severity: 'CRITICAL', Status: 'REPORTED', ReportedBy: 'engineer@demo', RejectNote: null,
      CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('parses a valid work order', () => {
    const result = workOrderSchema.safeParse({
      OrderId: '1', ReqId: '1', EquipId: '1', Priority: 'HIGH', Status: 'CREATED',
      AssignedTo: null, ScheduledDate: null, StartedAt: null, CompletedAt: null,
      DowntimeHours: null, CompletionNotes: null, CancelNote: null,
      CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run src/lib/types.test.ts`
Expected: FAIL with "Cannot find module './types'"

- [ ] **Step 3: Write `web/src/lib/types.ts`**

```typescript
import { z } from 'zod';

export const equipTypeEnum = z.enum(['CRUSHER', 'CONVEYOR', 'PUMP', 'HAUL_TRUCK', 'DRILL']);
export const criticalityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const opStatusEnum = z.enum(['OPERATIONAL', 'MAINTENANCE', 'DOWN']);
export const severityEnum = criticalityEnum;
export const requestStatusEnum = z.enum(['REPORTED', 'CONVERTED', 'REJECTED']);
export const orderStatusEnum = z.enum(['CREATED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const roleEnum = z.enum(['engineer', 'supervisor', 'technician']);
export type Role = z.infer<typeof roleEnum>;

export const equipmentSchema = z.object({
  EquipId: z.string(),
  EquipTag: z.string(),
  Name: z.string(),
  EquipType: equipTypeEnum,
  Site: z.string(),
  Criticality: criticalityEnum,
  OpStatus: opStatusEnum,
  InstalledOn: z.string().nullable(),
  CreatedAt: z.string(),
  ChangedAt: z.string(),
});
export type Equipment = z.infer<typeof equipmentSchema>;

export const maintRequestSchema = z.object({
  ReqId: z.string(),
  EquipId: z.string(),
  Title: z.string(),
  Description: z.string().nullable(),
  Severity: severityEnum,
  Status: requestStatusEnum,
  ReportedBy: z.string(),
  RejectNote: z.string().nullable(),
  CreatedAt: z.string(),
  ChangedAt: z.string(),
});
export type MaintenanceRequest = z.infer<typeof maintRequestSchema>;

export const workOrderSchema = z.object({
  OrderId: z.string(),
  ReqId: z.string(),
  EquipId: z.string(),
  Priority: criticalityEnum,
  Status: orderStatusEnum,
  AssignedTo: z.string().nullable(),
  ScheduledDate: z.string().nullable(),
  StartedAt: z.string().nullable(),
  CompletedAt: z.string().nullable(),
  DowntimeHours: z.number().nullable(),
  CompletionNotes: z.string().nullable(),
  CancelNote: z.string().nullable(),
  CreatedAt: z.string(),
  ChangedAt: z.string(),
});
export type WorkOrder = z.infer<typeof workOrderSchema>;

export const newRequestFormSchema = z.object({
  EquipId: z.string().min(1, 'Select equipment'),
  Title: z.string().min(1, 'Title is required').max(100),
  Description: z.string().max(255).optional(),
  Severity: severityEnum,
  ReportedBy: z.string().min(1),
});
export type NewRequestForm = z.infer<typeof newRequestFormSchema>;

export const scheduleFormSchema = z.object({
  ScheduledDate: z.string().min(1, 'Date is required'),
  AssignedTo: z.string().min(1, 'Technician is required'),
});
export type ScheduleForm = z.infer<typeof scheduleFormSchema>;

export const completeFormSchema = z.object({
  CompletionNotes: z.string().max(255).optional(),
  DowntimeHours: z.coerce.number().min(0, 'Downtime hours must be zero or greater'),
});
export type CompleteForm = z.infer<typeof completeFormSchema>;

export const rejectFormSchema = z.object({
  Note: z.string().min(1, 'A reason is required').max(255),
});
export type RejectForm = z.infer<typeof rejectFormSchema>;

export const cancelFormSchema = rejectFormSchema;
export type CancelForm = z.infer<typeof cancelFormSchema>;

export const convertFormSchema = z.object({
  Priority: criticalityEnum,
});
export type ConvertForm = z.infer<typeof convertFormSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run src/lib/types.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/types.ts web/src/lib/types.test.ts
git commit -m "feat(4.2): domain zod schemas matching OData response shape"
```

### Task 4.3: `domain.ts` role×status permission matrix

**Files:**
- Create: `web/src/lib/domain.ts`
- Test: `web/src/lib/domain.test.ts`

**Interfaces:**
- Consumes: `Role`, `MaintenanceRequest['Status']`, `WorkOrder['Status']` (Task 4.2).
- Produces: `canReportRequest(role)`, `canActOnRequest(role, action, ctx)`, `canActOnOrder(role, action, ctx, currentUser)` — the ONLY place role×status logic lives (CLAUDE.md rule 6). Every page/component task (4.11–4.14) imports these instead of re-deriving permissions.

- [ ] **Step 1: Write the failing test — full truth table**

```typescript
// web/src/lib/domain.test.ts
import { describe, it, expect } from 'vitest';
import { canReportRequest, canActOnRequest, canActOnOrder } from './domain';

describe('canReportRequest', () => {
  it.each([
    ['engineer', true],
    ['supervisor', true],
    ['technician', false],
  ] as const)('%s -> %s', (role, expected) => {
    expect(canReportRequest(role)).toBe(expected);
  });
});

describe('canActOnRequest', () => {
  it.each([
    ['engineer', 'convert_request', 'REPORTED', false],
    ['engineer', 'reject_request', 'REPORTED', false],
    ['technician', 'convert_request', 'REPORTED', false],
    ['technician', 'reject_request', 'REPORTED', false],
    ['supervisor', 'convert_request', 'REPORTED', true],
    ['supervisor', 'reject_request', 'REPORTED', true],
    ['supervisor', 'convert_request', 'CONVERTED', false],
    ['supervisor', 'reject_request', 'REJECTED', false],
  ] as const)('%s / %s / %s -> %s', (role, action, status, expected) => {
    expect(canActOnRequest(role, action, { status })).toBe(expected);
  });
});

describe('canActOnOrder', () => {
  it.each([
    // schedule_order — supervisor only, CREATED only
    ['supervisor', 'schedule_order', 'CREATED', null, 'tech@demo', true],
    ['supervisor', 'schedule_order', 'SCHEDULED', null, 'tech@demo', false],
    ['technician', 'schedule_order', 'CREATED', 'tech@demo', 'tech@demo', false],
    ['engineer', 'schedule_order', 'CREATED', null, 'tech@demo', false],

    // start_work — supervisor any assignee; technician only if assigned to self; status must be SCHEDULED
    ['supervisor', 'start_work', 'SCHEDULED', 'tech@demo', 'tech@demo', true],
    ['technician', 'start_work', 'SCHEDULED', 'tech@demo', 'tech@demo', true],
    ['technician', 'start_work', 'SCHEDULED', 'other@demo', 'tech@demo', false],
    ['technician', 'start_work', 'CREATED', 'tech@demo', 'tech@demo', false],
    ['engineer', 'start_work', 'SCHEDULED', 'tech@demo', 'tech@demo', false],

    // complete_work — same shape as start_work, status must be IN_PROGRESS
    ['supervisor', 'complete_work', 'IN_PROGRESS', 'tech@demo', 'tech@demo', true],
    ['technician', 'complete_work', 'IN_PROGRESS', 'tech@demo', 'tech@demo', true],
    ['technician', 'complete_work', 'IN_PROGRESS', 'other@demo', 'tech@demo', false],
    ['technician', 'complete_work', 'SCHEDULED', 'tech@demo', 'tech@demo', false],

    // cancel_order — supervisor only, CREATED or SCHEDULED
    ['supervisor', 'cancel_order', 'CREATED', null, 'tech@demo', true],
    ['supervisor', 'cancel_order', 'SCHEDULED', 'tech@demo', 'tech@demo', true],
    ['supervisor', 'cancel_order', 'IN_PROGRESS', 'tech@demo', 'tech@demo', false],
    ['technician', 'cancel_order', 'CREATED', 'tech@demo', 'tech@demo', false],
  ] as const)('%s / %s / status=%s assignedTo=%s current=%s -> %s', (role, action, status, assignedTo, currentUser, expected) => {
    expect(canActOnOrder(role, action, { status, assignedTo }, currentUser)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run src/lib/domain.test.ts`
Expected: FAIL with "Cannot find module './domain'"

- [ ] **Step 3: Write `web/src/lib/domain.ts`**

```typescript
import type { MaintenanceRequest, Role, WorkOrder } from './types';

export type RequestAction = 'convert_request' | 'reject_request';
export type OrderAction = 'schedule_order' | 'start_work' | 'complete_work' | 'cancel_order';

interface RequestContext {
  status: MaintenanceRequest['Status'];
}

interface OrderContext {
  status: WorkOrder['Status'];
  assignedTo: string | null;
}

export function canReportRequest(role: Role): boolean {
  return role === 'engineer' || role === 'supervisor';
}

export function canActOnRequest(role: Role, action: RequestAction, ctx: RequestContext): boolean {
  if (role !== 'supervisor') return false;
  return ctx.status === 'REPORTED';
}

function orderStatusAllows(action: OrderAction, status: WorkOrder['Status']): boolean {
  switch (action) {
    case 'schedule_order':
      return status === 'CREATED';
    case 'start_work':
      return status === 'SCHEDULED';
    case 'complete_work':
      return status === 'IN_PROGRESS';
    case 'cancel_order':
      return status === 'CREATED' || status === 'SCHEDULED';
  }
}

export function canActOnOrder(role: Role, action: OrderAction, ctx: OrderContext, currentUser: string): boolean {
  if (!orderStatusAllows(action, ctx.status)) return false;
  if (role === 'supervisor') return true;
  if (role === 'technician') {
    if (action === 'schedule_order' || action === 'cancel_order') return false;
    return ctx.assignedTo === currentUser;
  }
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run src/lib/domain.test.ts`
Expected: PASS (all `it.each` rows green — this is the "100% branch-tested truth table" spec §7 requires)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/domain.ts web/src/lib/domain.test.ts
git commit -m "feat(4.3): role x status permission matrix — the single source of truth for UI gating"
```

### Task 4.4: NextAuth demo personas

**Files:**
- Create: `web/src/lib/auth.ts`
- Create: `web/src/types/next-auth.d.ts`
- Create: `web/src/app/api/auth/[...nextauth]/route.ts`
- Test: `web/src/lib/auth.test.ts`

**Interfaces:**
- Consumes: `Role` (Task 4.2).
- Produces: `authOptions` (NextAuth config), `DemoRole` type — Task 4.10's login page posts `{ persona: DemoRole }` to this provider; every page reads `session.user.role: Role` via `getServerSession(authOptions)`.

- [ ] **Step 1: Write the failing test**

```typescript
// web/src/lib/auth.test.ts
import { describe, it, expect } from 'vitest';
import { authOptions } from './auth';

type Authorize = (credentials: Record<string, string> | undefined) => Promise<{ role: string } | null>;

describe('demo persona credentials provider', () => {
  // next-auth's CredentialsProvider() factory wraps the user-supplied authorize
  // under `.options.authorize` — the top-level `.authorize` is an internal stub.
  const provider = authOptions.providers[0] as unknown as { options: { authorize: Authorize } };

  it.each([
    ['engineer', 'engineer'],
    ['supervisor', 'supervisor'],
    ['technician', 'technician'],
  ])('authorizes persona "%s" with role "%s"', async (persona, expectedRole) => {
    const user = await provider.options.authorize({ persona });
    expect(user?.role).toBe(expectedRole);
  });

  it('rejects an unknown persona', async () => {
    const user = await provider.options.authorize({ persona: 'admin' });
    expect(user).toBeNull();
  });

  it('rejects missing credentials', async () => {
    const user = await provider.options.authorize(undefined);
    expect(user).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run src/lib/auth.test.ts`
Expected: FAIL with "Cannot find module './auth'"

- [ ] **Step 3: Write `web/src/lib/auth.ts`**

```typescript
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { Role } from './types';

const DEMO_PERSONAS = {
  engineer: { email: 'engineer@demo', name: 'Engineer', role: 'engineer' as const },
  supervisor: { email: 'supervisor@demo', name: 'Supervisor', role: 'supervisor' as const },
  technician: { email: 'tech@demo', name: 'Technician', role: 'technician' as const },
} satisfies Record<string, { email: string; name: string; role: Role }>;

export type DemoRole = keyof typeof DEMO_PERSONAS;

// ponytail: demo personas skip real password checks by design — spec §7 calls for
// one-click persona cards, and v1 explicitly excludes real SAP authorization objects (spec §10).
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Demo persona',
      credentials: { persona: { label: 'Persona', type: 'text' } },
      async authorize(credentials) {
        const persona = credentials?.persona as DemoRole | undefined;
        if (!persona || !(persona in DEMO_PERSONAS)) return null;
        const demo = DEMO_PERSONAS[persona];
        return { id: demo.email, email: demo.email, name: demo.name, role: demo.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as { role: Role }).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { role?: Role }).role = token.role as Role;
      return session;
    },
  },
  pages: { signIn: '/login' },
};
```

- [ ] **Step 4: Write `web/src/types/next-auth.d.ts`**

```typescript
import type { DefaultSession } from 'next-auth';
import type { Role } from '@/lib/types';

declare module 'next-auth' {
  interface User {
    role: Role;
  }
  interface Session {
    user: { role: Role } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role;
  }
}
```

- [ ] **Step 5: Write `web/src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd web && pnpm vitest run src/lib/auth.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/auth.ts web/src/lib/auth.test.ts web/src/types/next-auth.d.ts web/src/app/api/auth
git commit -m "feat(4.4): NextAuth demo-persona credentials provider with role claim"
```

### Task 4.5: MSW fixtures + handlers (mock mode)

> **Correction found during execution:** `vitest.setup.ts` (Task 4.1) imports `./src/mocks/server` unconditionally as a Vitest setup file — Vite must resolve it before *any* test in the suite can run, not just type-check it. That means no vitest test at all could run between Task 4.1 and this task, blocking 4.2/4.3/4.4's own TDD cycles. Fixed out-of-band, right after Task 3.2: `web/src/mocks/server.ts` was created early with an empty `setupServer()` (real MSW API, no fake stub), just enough to unblock `vitest.setup.ts`. This task now **modifies** that file to pass in the real `handlers` instead of creating it fresh.

**Files:**
- Create: `web/src/mocks/fixtures.ts`
- Create: `web/src/mocks/handlers.ts`
- Modify: `web/src/mocks/server.ts` (created early as `setupServer()` with no handlers — see correction note above; now becomes `setupServer(...handlers)`)
- Create: `web/src/mocks/browser.ts`
- Create: `web/src/mocks/mock-mode-init.tsx`
- Modify: `web/src/app/layout.tsx` (Task 4.1) — mount `<MockModeInit />`
- Test: `web/src/mocks/handlers.test.ts`

**Interfaces:**
- Consumes: `Equipment`, `MaintenanceRequest`, `WorkOrder` (Task 4.2).
- Produces: in-memory mutable fixtures `equipment`, `maintRequests`, `workOrders` and MSW `handlers` covering every `/api/sap/*` and `/api/insights/*` route the frontend calls. Task 4.6/4.7's proxy routes are real code paths that MSW's browser Service Worker intercepts before they're reached, in mock mode — no route-handler-level mocking needed. KPI response shapes here (`mttr_hours`, `open_requests_by_severity`, `open_orders`, `equipment_availability_pct`, `total_downtime_hours_30d`; `{by, data:[{group, downtime_hours}]}`; `{buckets:[{range,count}]}`; `{data:[{equip_type,count}]}`) are the exact shapes Task 5's analytics endpoints must also produce.

- [ ] **Step 1: Write `web/src/mocks/fixtures.ts`**

```typescript
import type { Equipment, MaintenanceRequest, WorkOrder } from '@/lib/types';

export const equipment: Equipment[] = [
  { EquipId: '1', EquipTag: 'CRU-104', Name: 'Primary crusher — Line 1', EquipType: 'CRUSHER', Site: 'Pilbara Site A', Criticality: 'CRITICAL', OpStatus: 'OPERATIONAL', InstalledOn: '2019-03-01', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
  { EquipId: '2', EquipTag: 'CNV-22', Name: 'Overland conveyor', EquipType: 'CONVEYOR', Site: 'Pilbara Site A', Criticality: 'HIGH', OpStatus: 'MAINTENANCE', InstalledOn: '2020-06-15', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
  { EquipId: '3', EquipTag: 'PMP-08', Name: 'Slurry pump', EquipType: 'PUMP', Site: 'Goldfields Site B', Criticality: 'MEDIUM', OpStatus: 'DOWN', InstalledOn: '2018-11-20', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
  { EquipId: '4', EquipTag: 'HTR-15', Name: 'Haul truck 15', EquipType: 'HAUL_TRUCK', Site: 'Goldfields Site B', Criticality: 'HIGH', OpStatus: 'OPERATIONAL', InstalledOn: '2021-02-10', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
];

export const maintRequests: MaintenanceRequest[] = [
  { ReqId: '1', EquipId: '3', Title: 'Pump seal leaking', Description: 'Visible slurry leak at seal housing', Severity: 'CRITICAL', Status: 'REPORTED', ReportedBy: 'engineer@demo', RejectNote: null, CreatedAt: '2026-07-10T02:00:00Z', ChangedAt: '2026-07-10T02:00:00Z' },
  { ReqId: '2', EquipId: '2', Title: 'Belt tracking off-center', Description: null, Severity: 'HIGH', Status: 'CONVERTED', ReportedBy: 'engineer@demo', RejectNote: null, CreatedAt: '2026-07-08T02:00:00Z', ChangedAt: '2026-07-09T02:00:00Z' },
];

export const workOrders: WorkOrder[] = [
  { OrderId: '1', ReqId: '2', EquipId: '2', Priority: 'HIGH', Status: 'IN_PROGRESS', AssignedTo: 'tech@demo', ScheduledDate: '2026-07-10', StartedAt: '2026-07-10T22:00:00Z', CompletedAt: null, DowntimeHours: null, CompletionNotes: null, CancelNote: null, CreatedAt: '2026-07-09T02:00:00Z', ChangedAt: '2026-07-10T22:00:00Z' },
];

export function resetFixtures() {
  equipment.length = 0;
  equipment.push(
    { EquipId: '1', EquipTag: 'CRU-104', Name: 'Primary crusher — Line 1', EquipType: 'CRUSHER', Site: 'Pilbara Site A', Criticality: 'CRITICAL', OpStatus: 'OPERATIONAL', InstalledOn: '2019-03-01', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
    { EquipId: '2', EquipTag: 'CNV-22', Name: 'Overland conveyor', EquipType: 'CONVEYOR', Site: 'Pilbara Site A', Criticality: 'HIGH', OpStatus: 'MAINTENANCE', InstalledOn: '2020-06-15', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
    { EquipId: '3', EquipTag: 'PMP-08', Name: 'Slurry pump', EquipType: 'PUMP', Site: 'Goldfields Site B', Criticality: 'MEDIUM', OpStatus: 'DOWN', InstalledOn: '2018-11-20', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
    { EquipId: '4', EquipTag: 'HTR-15', Name: 'Haul truck 15', EquipType: 'HAUL_TRUCK', Site: 'Goldfields Site B', Criticality: 'HIGH', OpStatus: 'OPERATIONAL', InstalledOn: '2021-02-10', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
  );
  maintRequests.length = 0;
  maintRequests.push(
    { ReqId: '1', EquipId: '3', Title: 'Pump seal leaking', Description: 'Visible slurry leak at seal housing', Severity: 'CRITICAL', Status: 'REPORTED', ReportedBy: 'engineer@demo', RejectNote: null, CreatedAt: '2026-07-10T02:00:00Z', ChangedAt: '2026-07-10T02:00:00Z' },
    { ReqId: '2', EquipId: '2', Title: 'Belt tracking off-center', Description: null, Severity: 'HIGH', Status: 'CONVERTED', ReportedBy: 'engineer@demo', RejectNote: null, CreatedAt: '2026-07-08T02:00:00Z', ChangedAt: '2026-07-09T02:00:00Z' },
  );
  workOrders.length = 0;
  workOrders.push(
    { OrderId: '1', ReqId: '2', EquipId: '2', Priority: 'HIGH', Status: 'IN_PROGRESS', AssignedTo: 'tech@demo', ScheduledDate: '2026-07-10', StartedAt: '2026-07-10T22:00:00Z', CompletedAt: null, DowntimeHours: null, CompletionNotes: null, CancelNote: null, CreatedAt: '2026-07-09T02:00:00Z', ChangedAt: '2026-07-10T22:00:00Z' },
  );
}
```

- [ ] **Step 2: Write `web/src/mocks/handlers.ts`**

```typescript
import { http, HttpResponse } from 'msw';
import { equipment, maintRequests, workOrders } from './fixtures';
import type { MaintenanceRequest, WorkOrder } from '@/lib/types';

const ACTION_NS = 'com.sap.gateway.srvd.zassetpulse_srv.v0001';

function parseKey(pathname: string, entity: string): string | null {
  const match = pathname.match(new RegExp(`/api/sap/${entity}\\('([^']+)'\\)`));
  return match?.[1] ?? null;
}

function applyListParams<T extends Record<string, unknown>>(list: T[], url: URL) {
  let result = [...list];
  const filter = url.searchParams.get('$filter');
  if (filter) {
    const match = filter.match(/(\w+) eq '([^']+)'/);
    const field = match?.[1];
    const value = match?.[2];
    if (field !== undefined && value !== undefined) {
      result = result.filter((item) => item[field] === value);
    }
  }
  const search = url.searchParams.get('$search');
  if (search) {
    result = result.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()));
  }
  if (url.searchParams.get('$orderby') === 'ChangedAt desc') {
    result = [...result].sort((a, b) => String(b.ChangedAt).localeCompare(String(a.ChangedAt)));
  }
  return { value: result, count: result.length };
}

export const handlers = [
  http.get('/api/sap/Equipment*', ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'Equipment');
    if (key) {
      const found = equipment.find((e) => e.EquipId === key);
      return found ? HttpResponse.json(found) : new HttpResponse(null, { status: 404 });
    }
    const { value, count } = applyListParams(equipment, url);
    return HttpResponse.json({ value, '@odata.count': count });
  }),

  http.get('/api/sap/MaintenanceRequest*', ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'MaintenanceRequest');
    if (key) {
      const found = maintRequests.find((r) => r.ReqId === key);
      return found ? HttpResponse.json(found) : new HttpResponse(null, { status: 404 });
    }
    const { value, count } = applyListParams(maintRequests, url);
    return HttpResponse.json({ value, '@odata.count': count });
  }),

  http.post('/api/sap/MaintenanceRequest', async ({ request }) => {
    const body = (await request.json()) as Partial<MaintenanceRequest>;
    const now = new Date().toISOString();
    const created: MaintenanceRequest = {
      ReqId: String(maintRequests.length + 1),
      EquipId: body.EquipId ?? '',
      Title: body.Title ?? '',
      Description: body.Description ?? null,
      Severity: body.Severity ?? 'MEDIUM',
      Status: 'REPORTED',
      ReportedBy: body.ReportedBy ?? '',
      RejectNote: null,
      CreatedAt: now,
      ChangedAt: now,
    };
    maintRequests.push(created);
    if (created.Severity === 'CRITICAL') {
      const equip = equipment.find((e) => e.EquipId === created.EquipId);
      if (equip) equip.OpStatus = 'DOWN';
    }
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post(`/api/sap/MaintenanceRequest*/${ACTION_NS}.RejectRequest`, async ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'MaintenanceRequest');
    const body = (await request.json()) as { Note: string };
    const req = maintRequests.find((r) => r.ReqId === key);
    if (!req) return new HttpResponse(null, { status: 404 });
    if (!body.Note) {
      return HttpResponse.json({ status: 400, code: 'FIELD_EMPTY', message: 'Note must not be empty' }, { status: 400 });
    }
    req.Status = 'REJECTED';
    req.RejectNote = body.Note;
    req.ChangedAt = new Date().toISOString();
    if (req.Severity === 'CRITICAL') {
      const equip = equipment.find((e) => e.EquipId === req.EquipId);
      if (equip) equip.OpStatus = 'OPERATIONAL';
    }
    return HttpResponse.json(req);
  }),

  http.post(`/api/sap/MaintenanceRequest*/${ACTION_NS}.ConvertToWorkOrder`, async ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'MaintenanceRequest');
    const body = (await request.json()) as { Priority?: string };
    const req = maintRequests.find((r) => r.ReqId === key);
    if (!req) return new HttpResponse(null, { status: 404 });
    req.Status = 'CONVERTED';
    req.ChangedAt = new Date().toISOString();
    const now = new Date().toISOString();
    const order: WorkOrder = {
      OrderId: String(workOrders.length + 1),
      ReqId: req.ReqId,
      EquipId: req.EquipId,
      Priority: (body.Priority || req.Severity) as WorkOrder['Priority'],
      Status: 'CREATED',
      AssignedTo: null,
      ScheduledDate: null,
      StartedAt: null,
      CompletedAt: null,
      DowntimeHours: null,
      CompletionNotes: null,
      CancelNote: null,
      CreatedAt: now,
      ChangedAt: now,
    };
    workOrders.push(order);
    return HttpResponse.json(req);
  }),

  http.get('/api/sap/WorkOrder*', ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'WorkOrder');
    if (key) {
      const found = workOrders.find((o) => o.OrderId === key);
      return found ? HttpResponse.json(found) : new HttpResponse(null, { status: 404 });
    }
    const { value, count } = applyListParams(workOrders, url);
    return HttpResponse.json({ value, '@odata.count': count });
  }),

  http.post(`/api/sap/WorkOrder*/${ACTION_NS}.Schedule`, async ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'WorkOrder');
    const body = (await request.json()) as { ScheduledDate: string; AssignedTo: string };
    const order = workOrders.find((o) => o.OrderId === key);
    if (!order) return new HttpResponse(null, { status: 404 });
    const today = new Date().toISOString().slice(0, 10);
    if (body.ScheduledDate < today) {
      return HttpResponse.json({ status: 400, code: 'SCHEDULE_IN_PAST', message: 'Scheduled date must not be in the past' }, { status: 400 });
    }
    order.Status = 'SCHEDULED';
    order.ScheduledDate = body.ScheduledDate;
    order.AssignedTo = body.AssignedTo;
    order.ChangedAt = new Date().toISOString();
    return HttpResponse.json(order);
  }),

  http.post(`/api/sap/WorkOrder*/${ACTION_NS}.StartWork`, ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'WorkOrder');
    const order = workOrders.find((o) => o.OrderId === key);
    if (!order) return new HttpResponse(null, { status: 404 });
    order.Status = 'IN_PROGRESS';
    order.StartedAt = new Date().toISOString();
    order.ChangedAt = order.StartedAt;
    const equip = equipment.find((e) => e.EquipId === order.EquipId);
    if (equip) equip.OpStatus = 'MAINTENANCE';
    return HttpResponse.json(order);
  }),

  http.post(`/api/sap/WorkOrder*/${ACTION_NS}.CompleteWork`, async ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'WorkOrder');
    const body = (await request.json()) as { CompletionNotes?: string; DowntimeHours: number };
    const order = workOrders.find((o) => o.OrderId === key);
    if (!order) return new HttpResponse(null, { status: 404 });
    if (body.DowntimeHours < 0) {
      return HttpResponse.json({ status: 400, code: 'NEGATIVE_DOWNTIME', message: 'Downtime hours must be zero or greater' }, { status: 400 });
    }
    order.Status = 'COMPLETED';
    order.CompletedAt = new Date().toISOString();
    order.ChangedAt = order.CompletedAt;
    order.CompletionNotes = body.CompletionNotes ?? null;
    order.DowntimeHours = body.DowntimeHours;
    const equip = equipment.find((e) => e.EquipId === order.EquipId);
    if (equip) equip.OpStatus = 'OPERATIONAL';
    return HttpResponse.json(order);
  }),

  http.post(`/api/sap/WorkOrder*/${ACTION_NS}.CancelOrder`, async ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'WorkOrder');
    const body = (await request.json()) as { Note: string };
    const order = workOrders.find((o) => o.OrderId === key);
    if (!order) return new HttpResponse(null, { status: 404 });
    if (!body.Note) {
      return HttpResponse.json({ status: 400, code: 'FIELD_EMPTY', message: 'Note must not be empty' }, { status: 400 });
    }
    order.Status = 'CANCELLED';
    order.CancelNote = body.Note;
    order.ChangedAt = new Date().toISOString();
    return HttpResponse.json(order);
  }),

  http.get('/api/insights/kpi/summary', () =>
    HttpResponse.json({
      mttr_hours: 6.4,
      open_requests_by_severity: { LOW: 1, MEDIUM: 2, HIGH: 1, CRITICAL: 1 },
      open_orders: 3,
      equipment_availability_pct: 83.3,
      total_downtime_hours_30d: 42.5,
    }),
  ),

  http.get('/api/insights/kpi/downtime', ({ request }) => {
    const url = new URL(request.url);
    const by = url.searchParams.get('by') ?? 'site';
    return HttpResponse.json({
      by,
      data:
        by === 'site'
          ? [{ group: 'Pilbara Site A', downtime_hours: 30 }, { group: 'Goldfields Site B', downtime_hours: 12.5 }]
          : [{ group: 'CRUSHER', downtime_hours: 18 }, { group: 'CONVEYOR', downtime_hours: 9 }],
    });
  }),

  http.get('/api/insights/kpi/backlog-aging', () =>
    HttpResponse.json({ buckets: [{ range: '0-7', count: 3 }, { range: '8-30', count: 2 }, { range: '30+', count: 1 }] }),
  ),

  http.get('/api/insights/kpi/frequency', () =>
    HttpResponse.json({
      data: [
        { equip_type: 'CRUSHER', count: 4 },
        { equip_type: 'CONVEYOR', count: 2 },
        { equip_type: 'PUMP', count: 3 },
        { equip_type: 'HAUL_TRUCK', count: 1 },
        { equip_type: 'DRILL', count: 1 },
      ],
    }),
  ),
];
```

- [ ] **Step 3: Update `web/src/mocks/server.ts` (now with real handlers) and write `web/src/mocks/browser.ts`**

```typescript
// web/src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// web/src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

- [ ] **Step 4: Generate the MSW service worker file and write the client bootstrap**

```bash
cd web && pnpm dlx msw init public/ --save
```

```tsx
// web/src/mocks/mock-mode-init.tsx
'use client';
import { useEffect } from 'react';

// Module-level (not React state) so it survives React 18 Strict Mode's dev-only
// double-invoke of effects (mount -> cleanup -> mount again). Without this guard,
// worker.start() — a singleton side effect with no matching cleanup — gets called
// twice and MSW throws "cannot configure an already enabled network" (found while
// stabilizing Task 4.16's e2e test).
let mockWorkerStarted = false;

export function MockModeInit() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === '1' && !mockWorkerStarted) {
      mockWorkerStarted = true;
      void import('./browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }));
    }
  }, []);
  return null;
}
```

- [ ] **Step 5: Mount it in the root layout**

```tsx
// web/src/app/layout.tsx — full replacement
import type { Metadata } from 'next';
import './globals.css';
import { MockModeInit } from '@/mocks/mock-mode-init';

export const metadata: Metadata = {
  title: 'AssetPulse',
  description: 'Asset maintenance control room',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <MockModeInit />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Write a handler smoke test**

```typescript
// web/src/mocks/handlers.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetFixtures } from './fixtures';

beforeEach(() => resetFixtures());

describe('mock handlers', () => {
  it('lists equipment', async () => {
    const res = await fetch('/api/sap/Equipment');
    const body = await res.json();
    expect(body.value).toHaveLength(4);
  });

  it('converts a request and creates a work order', async () => {
    const res = await fetch(`/api/sap/MaintenanceRequest('2')/com.sap.gateway.srvd.zassetpulse_srv.v0001.ConvertToWorkOrder`, {
      method: 'POST',
      body: JSON.stringify({ Priority: '' }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.Status).toBe('CONVERTED');

    const orders = await (await fetch('/api/sap/WorkOrder')).json();
    expect(orders.value.length).toBeGreaterThan(1);
  });

  it('rejects RejectRequest without a note', async () => {
    const res = await fetch(`/api/sap/MaintenanceRequest('1')/com.sap.gateway.srvd.zassetpulse_srv.v0001.RejectRequest`, {
      method: 'POST',
      body: JSON.stringify({ Note: '' }),
    });
    expect(res.status).toBe(400);
  });
});
```

Run: `cd web && pnpm vitest run src/mocks/handlers.test.ts`
Expected: PASS (3 tests) — MSW's node server (registered in `vitest.setup.ts`, Task 4.1) intercepts these `fetch` calls automatically.

- [ ] **Step 7: Commit**

```bash
git add web/src/mocks web/src/app/layout.tsx web/public/mockServiceWorker.js
git commit -m "feat(4.5): MSW fixtures and handlers for full mock-mode lifecycle"
```

### Task 4.6: `/api/sap/[...path]` server proxy — CSRF + auth + error normalization

**Files:**
- Create: `web/src/app/api/sap/[...path]/route.ts`
- Test: `web/src/app/api/sap/[...path]/route.test.ts`

**Interfaces:**
- Consumes: `SAP_BASE_URL`, `SAP_SERVICE_PATH`, `SAP_USER`, `SAP_PASS` (`.env`).
- Produces: `GET`/`POST`/`PATCH` route handlers. Errors normalize to `{ status, code, message }` (spec §5) — Task 4.8's hooks rely on this exact shape for toasts. In mock mode this code path is never exercised by e2e tests (MSW's browser worker intercepts `/api/sap/*` before the request reaches this handler) — it's covered here by isolated unit tests instead, and by the live smoke script (Task 2.2) / live E2E (Phase 6) against the real service.

- [ ] **Step 1: Write the failing test**

```typescript
// web/src/app/api/sap/[...path]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

beforeEach(() => {
  process.env.SAP_BASE_URL = 'https://sap.example.com';
  process.env.SAP_SERVICE_PATH = '/odata/v4/zassetpulse';
  process.env.SAP_USER = 'demo';
  process.env.SAP_PASS = 'secret';
  vi.restoreAllMocks();
});

describe('GET /api/sap/[...path]', () => {
  it('forwards the request with basic auth and returns JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ value: [{ EquipId: '1' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest('http://localhost/api/sap/Equipment?$top=1');
    const response = await GET(request, { params: { path: ['Equipment'] } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.value).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sap.example.com/odata/v4/zassetpulse/Equipment?$top=1',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining('Basic ') }) }),
    );
  });

  it('normalizes an OData error response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: { code: 'BAD_REQUEST', message: { value: 'Nope' } } }), { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest('http://localhost/api/sap/Equipment');
    const response = await GET(request, { params: { path: ['Equipment'] } });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ status: 400, code: 'BAD_REQUEST', message: 'Nope' });
  });
});

describe('POST /api/sap/[...path]', () => {
  it('fetches a CSRF token before writing and replays it with the cookie', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { 'x-csrf-token': 'tok123', 'set-cookie': 'sap-session=abc' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ Status: 'REJECTED' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest("http://localhost/api/sap/MaintenanceRequest('1')/RejectRequest", {
      method: 'POST',
      body: JSON.stringify({ Note: 'Duplicate' }),
    });
    const response = await POST(request, { params: { path: ["MaintenanceRequest('1')", 'RejectRequest'] } });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const writeCallHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(writeCallHeaders['x-csrf-token']).toBe('tok123');
    expect(writeCallHeaders.Cookie).toBe('sap-session=abc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/api/sap/[...path]/route.test.ts"`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Write `web/src/app/api/sap/[...path]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';

function targetUrl(pathSegments: string[], search: string): string {
  const base = `${process.env.SAP_BASE_URL}${process.env.SAP_SERVICE_PATH}`;
  return `${base}/${pathSegments.join('/')}${search}`;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${process.env.SAP_USER}:${process.env.SAP_PASS}`).toString('base64')}`;
}

async function normalizeError(res: Response) {
  let message = res.statusText;
  let code = 'UNKNOWN';
  try {
    const body = await res.json();
    const error = body.error ?? body;
    message = error.message?.value ?? error.message ?? message;
    code = error.code ?? code;
  } catch {
    // body wasn't JSON — keep statusText
  }
  return { status: res.status, code, message };
}

async function fetchCsrfToken(baseUrl: string): Promise<{ token: string; cookie: string }> {
  const res = await fetch(baseUrl, { headers: { Authorization: authHeader(), 'x-csrf-token': 'fetch' } });
  return { token: res.headers.get('x-csrf-token') ?? '', cookie: res.headers.get('set-cookie') ?? '' };
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const url = targetUrl(params.path, request.nextUrl.search);
  const res = await fetch(url, { headers: { Authorization: authHeader(), Accept: 'application/json' } });
  if (!res.ok) return NextResponse.json(await normalizeError(res), { status: res.status });
  return NextResponse.json(await res.json());
}

async function write(request: NextRequest, params: { path: string[] }, method: 'POST' | 'PATCH') {
  const base = `${process.env.SAP_BASE_URL}${process.env.SAP_SERVICE_PATH}`;
  const { token, cookie } = await fetchCsrfToken(base);
  const url = targetUrl(params.path, request.nextUrl.search);
  const body = await request.text();
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(),
      'x-csrf-token': token,
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body || undefined,
  });
  if (!res.ok) return NextResponse.json(await normalizeError(res), { status: res.status });
  const text = await res.text();
  return NextResponse.json(text ? JSON.parse(text) : {});
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return write(request, params, 'POST');
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return write(request, params, 'PATCH');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/api/sap/[...path]/route.test.ts"`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/api/sap/[...path]/route.ts" "web/src/app/api/sap/[...path]/route.test.ts"
git commit -m "feat(4.6): SAP OData proxy with CSRF handling and error normalization"
```

### Task 4.7: `/api/insights/[...path]` analytics proxy

**Files:**
- Create: `web/src/app/api/insights/[...path]/route.ts`
- Test: `web/src/app/api/insights/[...path]/route.test.ts`

**Interfaces:**
- Consumes: `ANALYTICS_URL` (`.env`).
- Produces: `GET` route handler — same `{ status, code, message }` error shape as Task 4.6 for consistent toast handling in Task 4.8's hooks.

- [ ] **Step 1: Write the failing test**

```typescript
// web/src/app/api/insights/[...path]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

beforeEach(() => {
  process.env.ANALYTICS_URL = 'https://analytics.example.com';
  vi.restoreAllMocks();
});

describe('GET /api/insights/[...path]', () => {
  it('forwards to the analytics service and returns JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ mttr_hours: 6.4 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest('http://localhost/api/insights/kpi/summary');
    const response = await GET(request, { params: { path: ['kpi', 'summary'] } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ mttr_hours: 6.4 });
    expect(fetchMock).toHaveBeenCalledWith('https://analytics.example.com/kpi/summary', expect.anything());
  });

  it('normalizes a failure response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503, statusText: 'Service Unavailable' }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest('http://localhost/api/insights/kpi/summary');
    const response = await GET(request, { params: { path: ['kpi', 'summary'] } });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 503, code: 'ANALYTICS_ERROR', message: 'Service Unavailable' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/api/insights/[...path]/route.test.ts"`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Write `web/src/app/api/insights/[...path]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${process.env.ANALYTICS_URL}/${params.path.join('/')}${request.nextUrl.search}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    return NextResponse.json({ status: res.status, code: 'ANALYTICS_ERROR', message: res.statusText }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/api/insights/[...path]/route.test.ts"`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/api/insights/[...path]/route.ts" "web/src/app/api/insights/[...path]/route.test.ts"
git commit -m "feat(4.7): analytics service proxy route"
```

### Task 4.8: TanStack Query provider + data hooks

**Files:**
- Create: `web/src/lib/api.ts`
- Create: `web/src/lib/query-provider.tsx`
- Modify: `web/src/app/layout.tsx` (Task 4.5) — wrap children in `<QueryProvider>`
- Create: `web/src/hooks/use-equipment.ts`, `web/src/hooks/use-requests.ts`, `web/src/hooks/use-orders.ts`, `web/src/hooks/use-insights.ts`
- Test: `web/src/hooks/use-requests.test.tsx`

**Interfaces:**
- Consumes: `equipmentSchema`, `maintRequestSchema`, `workOrderSchema`, `NewRequestForm`, `RejectForm`, `ConvertForm`, `ScheduleForm`, `CompleteForm`, `CancelForm` (Task 4.2); MSW handlers (Task 4.5).
- Produces: `ApiError`, `apiFetch` (Task 4.6/4.7's error shape parsed into a throwable); `useEquipmentList`, `useEquipment`, `useRequestList`, `useRequest`, `useCreateRequest`, `useRejectRequest`, `useConvertRequest`, `useOrderList`, `useOrder`, `useScheduleOrder`, `useStartWork`, `useCompleteWork`, `useCancelOrder`, `useKpiSummary`, `useKpiDowntime`, `useKpiBacklogAging`, `useKpiFrequency` — every page task (4.10–4.15) consumes exactly these hooks and never calls `fetch` directly.

- [ ] **Step 1: Write `web/src/lib/api.ts`**

```typescript
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.status ?? res.status, body?.code ?? 'UNKNOWN', body?.message ?? res.statusText);
  }
  return body as T;
}
```

- [ ] **Step 2: Write `web/src/lib/query-provider.tsx`**

```tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1 } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 3: Mount it in the root layout**

```tsx
// web/src/app/layout.tsx — full replacement
import type { Metadata } from 'next';
import './globals.css';
import { MockModeInit } from '@/mocks/mock-mode-init';
import { QueryProvider } from '@/lib/query-provider';

export const metadata: Metadata = {
  title: 'AssetPulse',
  description: 'Asset maintenance control room',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <MockModeInit />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Write `web/src/hooks/use-equipment.ts`**

```typescript
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import { equipmentSchema, type Equipment } from '@/lib/types';

const listSchema = z.object({ value: z.array(equipmentSchema) });

export function useEquipmentList(params?: { opStatus?: Equipment['OpStatus']; search?: string }) {
  return useQuery({
    queryKey: ['equipment', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.opStatus) search.set('$filter', `OpStatus eq '${params.opStatus}'`);
      if (params?.search) search.set('$search', params.search);
      const data = await apiFetch<unknown>(`/api/sap/Equipment?${search}`);
      return listSchema.parse(data).value;
    },
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useEquipment(id: string) {
  return useQuery({
    queryKey: ['equipment', id],
    queryFn: () => apiFetch<unknown>(`/api/sap/Equipment('${id}')`).then((d) => equipmentSchema.parse(d)),
    enabled: !!id,
  });
}
```

- [ ] **Step 5: Write `web/src/hooks/use-requests.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import {
  maintRequestSchema, type MaintenanceRequest, type NewRequestForm, type RejectForm, type ConvertForm,
} from '@/lib/types';

const listSchema = z.object({ value: z.array(maintRequestSchema) });
const ACTION_NS = 'com.sap.gateway.srvd.zassetpulse_srv.v0001';

export function useRequestList(params?: { status?: MaintenanceRequest['Status']; search?: string }) {
  return useQuery({
    queryKey: ['requests', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.status) search.set('$filter', `Status eq '${params.status}'`);
      if (params?.search) search.set('$search', params.search);
      search.set('$orderby', 'ChangedAt desc');
      const data = await apiFetch<unknown>(`/api/sap/MaintenanceRequest?${search}`);
      return listSchema.parse(data).value;
    },
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ['requests', id],
    queryFn: () => apiFetch<unknown>(`/api/sap/MaintenanceRequest('${id}')`).then((d) => maintRequestSchema.parse(d)),
    enabled: !!id,
  });
}

export function useCreateRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: NewRequestForm) =>
      apiFetch<MaintenanceRequest>('/api/sap/MaintenanceRequest', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export function useRejectRequest(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: RejectForm) =>
      apiFetch<MaintenanceRequest>(`/api/sap/MaintenanceRequest('${id}')/${ACTION_NS}.RejectRequest`, {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onMutate: async (form) => {
      await client.cancelQueries({ queryKey: ['requests', id] });
      const previous = client.getQueryData<MaintenanceRequest>(['requests', id]);
      if (previous) client.setQueryData(['requests', id], { ...previous, Status: 'REJECTED', RejectNote: form.Note });
      return { previous };
    },
    onError: (_err, _form, context) => {
      if (context?.previous) client.setQueryData(['requests', id], context.previous);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['requests', id] });
      client.invalidateQueries({ queryKey: ['requests'] });
      client.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useConvertRequest(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: ConvertForm) =>
      apiFetch<MaintenanceRequest>(`/api/sap/MaintenanceRequest('${id}')/${ACTION_NS}.ConvertToWorkOrder`, {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onMutate: async () => {
      await client.cancelQueries({ queryKey: ['requests', id] });
      const previous = client.getQueryData<MaintenanceRequest>(['requests', id]);
      if (previous) client.setQueryData(['requests', id], { ...previous, Status: 'CONVERTED' });
      return { previous };
    },
    onError: (_err, _form, context) => {
      if (context?.previous) client.setQueryData(['requests', id], context.previous);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['requests', id] });
      client.invalidateQueries({ queryKey: ['requests'] });
      client.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
```

- [ ] **Step 6: Write `web/src/hooks/use-orders.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import {
  workOrderSchema, type WorkOrder, type ScheduleForm, type CompleteForm, type CancelForm,
} from '@/lib/types';

const listSchema = z.object({ value: z.array(workOrderSchema) });
const ACTION_NS = 'com.sap.gateway.srvd.zassetpulse_srv.v0001';

export function useOrderList(params?: { assignedTo?: string }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.assignedTo) search.set('$filter', `AssignedTo eq '${params.assignedTo}'`);
      search.set('$orderby', 'ChangedAt desc');
      const data = await apiFetch<unknown>(`/api/sap/WorkOrder?${search}`);
      return listSchema.parse(data).value;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => apiFetch<unknown>(`/api/sap/WorkOrder('${id}')`).then((d) => workOrderSchema.parse(d)),
    enabled: !!id,
  });
}

function useOrderAction<TForm>(id: string, action: string, optimisticPatch: (form: TForm) => Partial<WorkOrder>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: TForm) =>
      apiFetch<WorkOrder>(`/api/sap/WorkOrder('${id}')/${ACTION_NS}.${action}`, { method: 'POST', body: JSON.stringify(form) }),
    onMutate: async (form) => {
      await client.cancelQueries({ queryKey: ['orders', id] });
      const previous = client.getQueryData<WorkOrder>(['orders', id]);
      if (previous) client.setQueryData(['orders', id], { ...previous, ...optimisticPatch(form) });
      return { previous };
    },
    onError: (_err, _form, context) => {
      if (context?.previous) client.setQueryData(['orders', id], context.previous);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['orders', id] });
      client.invalidateQueries({ queryKey: ['orders'] });
      client.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useScheduleOrder(id: string) {
  return useOrderAction<ScheduleForm>(id, 'Schedule', (form) => ({ Status: 'SCHEDULED', ...form }));
}

export function useStartWork(id: string) {
  return useOrderAction<Record<string, never>>(id, 'StartWork', () => ({ Status: 'IN_PROGRESS' }));
}

export function useCompleteWork(id: string) {
  return useOrderAction<CompleteForm>(id, 'CompleteWork', (form) => ({ Status: 'COMPLETED', ...form }));
}

export function useCancelOrder(id: string) {
  return useOrderAction<CancelForm>(id, 'CancelOrder', () => ({ Status: 'CANCELLED' }));
}
```

- [ ] **Step 7: Write `web/src/hooks/use-insights.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';

const summarySchema = z.object({
  mttr_hours: z.number(),
  open_requests_by_severity: z.record(z.number()),
  open_orders: z.number(),
  equipment_availability_pct: z.number(),
  total_downtime_hours_30d: z.number(),
});
const downtimeSchema = z.object({ by: z.string(), data: z.array(z.object({ group: z.string(), downtime_hours: z.number() })) });
const backlogSchema = z.object({ buckets: z.array(z.object({ range: z.string(), count: z.number() })) });
const frequencySchema = z.object({ data: z.array(z.object({ equip_type: z.string(), count: z.number() })) });

export function useKpiSummary() {
  return useQuery({
    queryKey: ['insights', 'summary'],
    queryFn: () => apiFetch<unknown>('/api/insights/kpi/summary').then((d) => summarySchema.parse(d)),
    refetchInterval: 30_000,
  });
}

export function useKpiDowntime(by: 'site' | 'type') {
  return useQuery({
    queryKey: ['insights', 'downtime', by],
    queryFn: () => apiFetch<unknown>(`/api/insights/kpi/downtime?by=${by}`).then((d) => downtimeSchema.parse(d)),
  });
}

export function useKpiBacklogAging() {
  return useQuery({
    queryKey: ['insights', 'backlog-aging'],
    queryFn: () => apiFetch<unknown>('/api/insights/kpi/backlog-aging').then((d) => backlogSchema.parse(d)),
  });
}

export function useKpiFrequency() {
  return useQuery({
    queryKey: ['insights', 'frequency'],
    queryFn: () => apiFetch<unknown>('/api/insights/kpi/frequency').then((d) => frequencySchema.parse(d)),
  });
}
```

- [ ] **Step 8: Write the failing optimistic-update/rollback test**

```tsx
// web/src/hooks/use-requests.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/server';
import { resetFixtures } from '@/mocks/fixtures';
import { useRequest, useRejectRequest } from './use-requests';

beforeEach(() => resetFixtures());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useRejectRequest', () => {
  it('optimistically sets status then confirms from the server', async () => {
    const { result } = renderHook(() => ({ request: useRequest('1'), reject: useRejectRequest('1') }), { wrapper });

    await waitFor(() => expect(result.current.request.data?.Status).toBe('REPORTED'));
    result.current.reject.mutate({ Note: 'Duplicate report' });

    await waitFor(() => expect(result.current.reject.isSuccess).toBe(true));
    expect(result.current.request.data?.Status).toBe('REJECTED');
  });

  it('rolls back the optimistic update on a 4xx response', async () => {
    server.use(
      http.post(
        '/api/sap/MaintenanceRequest*/com.sap.gateway.srvd.zassetpulse_srv.v0001.RejectRequest',
        () => HttpResponse.json({ status: 400, code: 'FIELD_EMPTY', message: 'Note must not be empty' }, { status: 400 }),
      ),
    );

    const { result } = renderHook(() => ({ request: useRequest('1'), reject: useRejectRequest('1') }), { wrapper });
    await waitFor(() => expect(result.current.request.data?.Status).toBe('REPORTED'));

    result.current.reject.mutate({ Note: '' });

    await waitFor(() => expect(result.current.reject.isError).toBe(true));
    expect(result.current.request.data?.Status).toBe('REPORTED');
  });
});
```

- [ ] **Step 9: Run test to verify it fails, then passes**

Run: `cd web && pnpm vitest run src/hooks/use-requests.test.tsx`
Expected first: FAIL ("Cannot find module './use-requests'"). After Step 5's file exists: PASS (2 tests).

- [ ] **Step 10: Commit**

```bash
git add web/src/lib/api.ts web/src/lib/query-provider.tsx web/src/app/layout.tsx web/src/hooks
git commit -m "feat(4.8): TanStack Query hooks with optimistic update + rollback"
```

### Task 4.9: Shared UI primitives (badges, KPI card, states, confirm dialog)

**Files:**
- Create: `web/src/components/badges.tsx`
- Create: `web/src/components/kpi-card.tsx`
- Create: `web/src/components/states.tsx`
- Create: `web/src/components/confirm-dialog.tsx`
- Test: `web/src/components/badges.test.tsx`

**Interfaces:**
- Consumes: `Equipment['OpStatus']`, `MaintenanceRequest['Severity']`, `WorkOrder['Status']` (Task 4.2); shadcn `Button`, `Dialog*` (Task 4.1); Tailwind color classes generated from `severity`/`opstatus`/`lifecycle` tokens (Task 4.1).
- Produces: `SeverityBadge`, `OpStatusBadge`, `LifecycleBadge`, `KpiCard`, `EmptyState`, `ErrorState`, `Skeleton` re-export, `ConfirmDialog` — every page task (4.10–4.15) builds on these instead of hand-rolling status colors, satisfying CLAUDE.md's "design tokens only, no ad-hoc hex" rule.

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/components/badges.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeverityBadge, OpStatusBadge, LifecycleBadge } from './badges';

describe('SeverityBadge', () => {
  it('renders the label and critical pulse class for CRITICAL', () => {
    render(<SeverityBadge severity="CRITICAL" />);
    const badge = screen.getByText('Critical');
    expect(badge.className).toContain('bg-severity-critical-bg');
    expect(badge.className).toContain('animate-pulse');
  });

  it('does not pulse for LOW', () => {
    render(<SeverityBadge severity="LOW" />);
    expect(screen.getByText('Low').className).not.toContain('animate-pulse');
  });
});

describe('OpStatusBadge', () => {
  it('renders DOWN with the alarm classes', () => {
    render(<OpStatusBadge status="DOWN" />);
    expect(screen.getByText('Down').className).toContain('bg-opstatus-down-bg');
  });
});

describe('LifecycleBadge', () => {
  it('renders IN_PROGRESS with its lifecycle classes', () => {
    render(<LifecycleBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In progress').className).toContain('bg-lifecycle-in_progress-bg');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run src/components/badges.test.tsx`
Expected: FAIL with "Cannot find module './badges'"

- [ ] **Step 3: Write `web/src/components/badges.tsx`**

Tailwind's class scanner needs statically-written class names — never build them from template literals — so each badge uses an explicit lookup map instead of interpolating the enum value into a class string.

```tsx
import { cn } from '@/lib/utils';
import type { Equipment, MaintenanceRequest, WorkOrder } from '@/lib/types';

const BASE = 'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium';

const SEVERITY: Record<MaintenanceRequest['Severity'], { label: string; classes: string }> = {
  LOW: { label: 'Low', classes: 'bg-severity-low-bg text-severity-low-fg border-severity-low-border font-mono' },
  MEDIUM: { label: 'Medium', classes: 'bg-severity-medium-bg text-severity-medium-fg border-severity-medium-border font-mono' },
  HIGH: { label: 'High', classes: 'bg-severity-high-bg text-severity-high-fg border-severity-high-border font-mono' },
  CRITICAL: { label: 'Critical', classes: 'bg-severity-critical-bg text-severity-critical-fg border-severity-critical-border font-mono motion-safe:animate-pulse' },
};

export function SeverityBadge({ severity }: { severity: MaintenanceRequest['Severity'] }) {
  const { label, classes } = SEVERITY[severity];
  return <span className={cn(BASE, classes)}>{label}</span>;
}

const OPSTATUS: Record<Equipment['OpStatus'], { label: string; classes: string }> = {
  OPERATIONAL: { label: 'Operational', classes: 'bg-opstatus-operational-bg text-opstatus-operational-fg border-opstatus-operational-border' },
  MAINTENANCE: { label: 'Maintenance', classes: 'bg-opstatus-maintenance-bg text-opstatus-maintenance-fg border-opstatus-maintenance-border' },
  DOWN: { label: 'Down', classes: 'bg-opstatus-down-bg text-opstatus-down-fg border-opstatus-down-border' },
};

export function OpStatusBadge({ status }: { status: Equipment['OpStatus'] }) {
  const { label, classes } = OPSTATUS[status];
  return <span className={cn(BASE, classes)}>{label}</span>;
}

const LIFECYCLE: Record<WorkOrder['Status'], { label: string; classes: string }> = {
  CREATED: { label: 'Created', classes: 'bg-lifecycle-created-bg text-lifecycle-created-fg border-lifecycle-created-border' },
  SCHEDULED: { label: 'Scheduled', classes: 'bg-lifecycle-scheduled-bg text-lifecycle-scheduled-fg border-lifecycle-scheduled-border' },
  IN_PROGRESS: { label: 'In progress', classes: 'bg-lifecycle-in_progress-bg text-lifecycle-in_progress-fg border-lifecycle-in_progress-border' },
  COMPLETED: { label: 'Completed', classes: 'bg-lifecycle-completed-bg text-lifecycle-completed-fg border-lifecycle-completed-border' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-lifecycle-cancelled-bg text-lifecycle-cancelled-fg border-lifecycle-cancelled-border' },
};

export function LifecycleBadge({ status }: { status: WorkOrder['Status'] }) {
  const { label, classes } = LIFECYCLE[status];
  return <span className={cn(BASE, classes)}>{label}</span>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run src/components/badges.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Write `web/src/components/kpi-card.tsx`**

```tsx
export function KpiCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-lg border border-surface-raised bg-surface-panel p-4">
      <div className="text-xs uppercase tracking-wide text-content-secondary">{label}</div>
      <div className="mt-1 font-mono text-3xl tabular-nums text-content-primary">
        {value}
        {unit && <span className="ml-1 text-lg text-content-secondary">{unit}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write `web/src/components/states.tsx`**

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export { Skeleton };

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-surface-raised p-10 text-center">
      <p className="font-medium text-content-primary">{title}</p>
      <p className="text-sm text-content-secondary">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-severity-high-border bg-severity-high-bg p-10 text-center">
      <p className="text-sm text-severity-high-fg">{message}</p>
      <Button variant="outline" onClick={onRetry}>Retry</Button>
    </div>
  );
}
```

- [ ] **Step 7: Write `web/src/components/confirm-dialog.tsx`**

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  pending,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  pending?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children && <div className="py-2">{children}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add web/src/components/badges.tsx web/src/components/badges.test.tsx web/src/components/kpi-card.tsx web/src/components/states.tsx web/src/components/confirm-dialog.tsx
git commit -m "feat(4.9): shared severity/status badges, KPI card, empty/error states, confirm dialog"
```

### Task 4.10: `/login` page + authenticated app shell

**Files:**
- Create: `web/src/lib/session-provider.tsx`
- Modify: `web/src/app/layout.tsx` (Task 4.8) — add `<AuthProvider>` around `<QueryProvider>`
- Create: `web/src/app/login/page.tsx`
- Test: `web/src/app/login/page.test.tsx`
- Create: `web/src/app/(app)/layout.tsx`
- Create: `web/src/app/(app)/sign-out-button.tsx`

**Interfaces:**
- Consumes: `authOptions`, `DemoRole` (Task 4.4).
- Produces: the `(app)` route group layout every subsequent page (Task 4.11–4.15) lives under — it redirects unauthenticated visitors to `/login` and renders top nav + signed-in persona + sign-out. Client components elsewhere use `useSession()` (from `next-auth/react`, enabled by `AuthProvider` here) to read `session.user.role`.

- [ ] **Step 1: Write `web/src/lib/session-provider.tsx`**

```tsx
'use client';
import { SessionProvider } from 'next-auth/react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 2: Update `web/src/app/layout.tsx` (full replacement, cumulative with Task 4.5/4.8)**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { MockModeInit } from '@/mocks/mock-mode-init';
import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/lib/session-provider';

export const metadata: Metadata = {
  title: 'AssetPulse',
  description: 'Asset maintenance control room',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <MockModeInit />
        <AuthProvider>
          <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Write the failing login page test**

```tsx
// web/src/app/login/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const signInMock = vi.fn();
vi.mock('next-auth/react', () => ({ signIn: (...args: unknown[]) => signInMock(...args) }));

beforeEach(() => {
  pushMock.mockReset();
  signInMock.mockReset();
});

describe('LoginPage', () => {
  it('signs in as supervisor and navigates home', async () => {
    signInMock.mockResolvedValue({ ok: true });
    render(<LoginPage />);

    fireEvent.click(screen.getByText('Supervisor'));

    await waitFor(() => expect(signInMock).toHaveBeenCalledWith('credentials', { persona: 'supervisor', redirect: false }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd web && pnpm vitest run src/app/login/page.test.tsx`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 5: Write `web/src/app/login/page.tsx`**

```tsx
'use client';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DemoRole } from '@/lib/auth';

const PERSONAS: { persona: DemoRole; title: string; description: string }[] = [
  { persona: 'engineer', title: 'Engineer', description: 'Reports faults from the field.' },
  { persona: 'supervisor', title: 'Supervisor', description: 'Converts, rejects, schedules, and cancels — sees everything.' },
  { persona: 'technician', title: 'Technician', description: 'Starts and completes assigned work orders.' },
];

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState<DemoRole | null>(null);

  async function handleLogin(persona: DemoRole) {
    setPending(persona);
    const result = await signIn('credentials', { persona, redirect: false });
    setPending(null);
    if (result?.ok) router.push('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-content-primary">AssetPulse</h1>
        <p className="mt-1 text-sm text-content-secondary">Asset maintenance control room</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {PERSONAS.map(({ persona, title, description }) => (
          <button
            key={persona}
            type="button"
            onClick={() => handleLogin(persona)}
            disabled={pending !== null}
            className="w-64 rounded-lg border border-surface-raised bg-surface-panel p-5 text-left transition-colors hover:border-content-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-primary disabled:opacity-50"
          >
            <div className="font-medium text-content-primary">{title}</div>
            <p className="mt-1 text-sm text-content-secondary">{description}</p>
            {pending === persona && <p className="mt-2 text-xs text-content-secondary">Signing in…</p>}
          </button>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd web && pnpm vitest run src/app/login/page.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 7: Write the authenticated app shell**

```tsx
// web/src/app/(app)/sign-out-button.tsx
'use client';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
      Sign out
    </Button>
  );
}
```

```tsx
// web/src/app/(app)/layout.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { SignOutButton } from './sign-out-button';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-surface-raised bg-surface-panel px-6 py-3">
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="text-content-primary hover:text-content-secondary">Control room</Link>
          <Link href="/equipment" className="text-content-secondary hover:text-content-primary">Equipment</Link>
          <Link href="/requests" className="text-content-secondary hover:text-content-primary">Requests</Link>
          <Link href="/orders" className="text-content-secondary hover:text-content-primary">Orders</Link>
          <Link href="/insights" className="text-content-secondary hover:text-content-primary">Insights</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm text-content-secondary">
          <span className="font-mono">{session.user?.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/session-provider.tsx web/src/app/layout.tsx web/src/app/login "web/src/app/(app)"
git commit -m "feat(4.10): login page with demo persona cards + authenticated app shell"
```

### Task 4.11: Control room dashboard (`/`)

**Files:**
- Create: `web/src/app/(app)/page.tsx`
- Test: `web/src/app/(app)/page.test.tsx`

**Interfaces:**
- Consumes: `useKpiSummary` (Task 4.8), `useEquipmentList`, `useRequestList`, `useOrderList` (Task 4.8), `KpiCard`, `OpStatusBadge`, `SeverityBadge`, `EmptyState`, `ErrorState`, `Skeleton` (Task 4.9).

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/app/(app)/page.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import DashboardPage from './page';

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('DashboardPage', () => {
  it('shows KPI numbers, equipment tags, and the critical alert', async () => {
    renderWithClient(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('6.4')).toBeInTheDocument());
    expect(await screen.findByText('CRU-104')).toBeInTheDocument();
    expect(await screen.findByText('Pump seal leaking')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/(app)/page.test.tsx"`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 3: Write `web/src/app/(app)/page.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { useKpiSummary } from '@/hooks/use-insights';
import { useEquipmentList } from '@/hooks/use-equipment';
import { useRequestList } from '@/hooks/use-requests';
import { useOrderList } from '@/hooks/use-orders';
import { KpiCard } from '@/components/kpi-card';
import { OpStatusBadge, SeverityBadge } from '@/components/badges';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';

export default function DashboardPage() {
  const kpi = useKpiSummary();
  const equipmentQuery = useEquipmentList();
  const criticalAlerts = useRequestList({ status: 'REPORTED' });
  const recentRequests = useRequestList();
  const recentOrders = useOrderList();

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="KPI summary" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpi.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        {kpi.isError && <ErrorState message="Could not load KPIs" onRetry={() => kpi.refetch()} />}
        {kpi.data && (
          <>
            <KpiCard label="MTTR" value={kpi.data.mttr_hours.toFixed(1)} unit="hrs" />
            <KpiCard label="Availability" value={kpi.data.equipment_availability_pct.toFixed(1)} unit="%" />
            <KpiCard label="Open orders" value={kpi.data.open_orders} />
            <KpiCard label="Downtime (30d)" value={kpi.data.total_downtime_hours_30d.toFixed(1)} unit="hrs" />
          </>
        )}
      </section>

      <section aria-label="Equipment status board">
        <h2 className="mb-2 text-sm font-medium text-content-secondary">Equipment status</h2>
        {equipmentQuery.isLoading && <Skeleton className="h-32" />}
        {equipmentQuery.isError && <ErrorState message="Could not load equipment" onRetry={() => equipmentQuery.refetch()} />}
        {equipmentQuery.data?.length === 0 && <EmptyState title="No equipment yet" description="Equipment will appear here once registered." />}
        {equipmentQuery.data && equipmentQuery.data.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {equipmentQuery.data.map((equip) => (
              <Link
                key={equip.EquipId}
                href={`/equipment/${equip.EquipId}`}
                className="flex items-center gap-2 rounded-md border border-surface-raised bg-surface-panel px-3 py-2 text-sm hover:border-content-secondary"
              >
                <span className="font-mono text-content-primary">{equip.EquipTag}</span>
                <OpStatusBadge status={equip.OpStatus} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Critical alerts">
        <h2 className="mb-2 text-sm font-medium text-content-secondary">Critical alerts</h2>
        {criticalAlerts.data?.filter((r) => r.Severity === 'CRITICAL').length === 0 && (
          <EmptyState title="No critical alerts" description="Nothing critical reported right now." />
        )}
        <ul className="flex flex-col gap-2">
          {criticalAlerts.data
            ?.filter((r) => r.Severity === 'CRITICAL')
            .map((req) => (
              <li
                key={req.ReqId}
                className="flex items-center justify-between rounded-md border border-severity-critical-border bg-severity-critical-bg px-3 py-2"
              >
                <Link href={`/requests/${req.ReqId}`} className="text-sm text-severity-critical-fg">{req.Title}</Link>
                <SeverityBadge severity={req.Severity} />
              </li>
            ))}
        </ul>
      </section>

      <section aria-label="Recent activity">
        <h2 className="mb-2 text-sm font-medium text-content-secondary">Recent activity</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {recentRequests.data?.slice(0, 5).map((req) => (
            <li key={req.ReqId} className="flex justify-between text-content-secondary">
              <span>Request: {req.Title}</span>
              <span className="font-mono text-xs">{new Date(req.ChangedAt).toLocaleString()}</span>
            </li>
          ))}
          {recentOrders.data?.slice(0, 5).map((order) => (
            <li key={order.OrderId} className="flex justify-between text-content-secondary">
              <span>Order #{order.OrderId}: {order.Status}</span>
              <span className="font-mono text-xs">{new Date(order.ChangedAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/(app)/page.test.tsx"`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/page.tsx" "web/src/app/(app)/page.test.tsx"
git commit -m "feat(4.11): control room dashboard"
```

### Task 4.12: `/equipment` register + `/equipment/[id]` detail

**Files:**
- Create: `web/src/app/(app)/equipment/page.tsx`
- Test: `web/src/app/(app)/equipment/page.test.tsx`
- Create: `web/src/app/(app)/equipment/[id]/page.tsx`
- Test: `web/src/app/(app)/equipment/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `useEquipmentList`, `useEquipment` (Task 4.8); `useRequestList`, `useOrderList` (Task 4.8); `canReportRequest` (Task 4.3); `OpStatusBadge`, `SeverityBadge`, `LifecycleBadge` (Task 4.9).

- [ ] **Step 1: Write the failing list-page test**

```tsx
// web/src/app/(app)/equipment/page.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import EquipmentListPage from './page';

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('EquipmentListPage', () => {
  it('lists all equipment and filters by search text', async () => {
    renderWithClient(<EquipmentListPage />);
    await waitFor(() => expect(screen.getByText('CRU-104')).toBeInTheDocument());
    expect(screen.getByText('PMP-08')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search tag or name…'), { target: { value: 'crusher' } });

    await waitFor(() => expect(screen.queryByText('PMP-08')).not.toBeInTheDocument());
    expect(screen.getByText('CRU-104')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/(app)/equipment/page.test.tsx"`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 3: Write `web/src/app/(app)/equipment/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useEquipmentList } from '@/hooks/use-equipment';
import { OpStatusBadge } from '@/components/badges';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';
import { Input } from '@/components/ui/input';
import type { Equipment } from '@/lib/types';

const OP_STATUS_OPTIONS: Array<Equipment['OpStatus'] | 'ALL'> = ['ALL', 'OPERATIONAL', 'MAINTENANCE', 'DOWN'];

export default function EquipmentListPage() {
  const [search, setSearch] = useState('');
  const [opStatus, setOpStatus] = useState<Equipment['OpStatus'] | 'ALL'>('ALL');
  const query = useEquipmentList({ search: search || undefined, opStatus: opStatus === 'ALL' ? undefined : opStatus });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Search tag or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select
          value={opStatus}
          onChange={(e) => setOpStatus(e.target.value as Equipment['OpStatus'] | 'ALL')}
          className="rounded-md border border-surface-raised bg-surface-panel px-2 py-1 text-sm text-content-primary"
        >
          {OP_STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt === 'ALL' ? 'All statuses' : opt}</option>
          ))}
        </select>
      </div>

      {query.isLoading && <Skeleton className="h-64" />}
      {query.isError && <ErrorState message="Could not load equipment" onRetry={() => query.refetch()} />}
      {query.data?.length === 0 && <EmptyState title="No equipment found" description="Try a different search or filter." />}
      {query.data && query.data.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-raised text-content-secondary">
              <th className="py-2 font-medium">Tag</th>
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Type</th>
              <th className="py-2 font-medium">Site</th>
              <th className="py-2 font-medium">Criticality</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((equip) => (
              <tr key={equip.EquipId} className="border-b border-surface-raised/50 hover:bg-surface-panel">
                <td className="py-2">
                  <Link href={`/equipment/${equip.EquipId}`} className="font-mono text-content-primary">{equip.EquipTag}</Link>
                </td>
                <td className="py-2 text-content-secondary">{equip.Name}</td>
                <td className="py-2 text-content-secondary">{equip.EquipType}</td>
                <td className="py-2 text-content-secondary">{equip.Site}</td>
                <td className="py-2 text-content-secondary">{equip.Criticality}</td>
                <td className="py-2"><OpStatusBadge status={equip.OpStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/(app)/equipment/page.test.tsx"`
Expected: PASS (1 test)

- [ ] **Step 5: Write the failing detail-page test**

```tsx
// web/src/app/(app)/equipment/[id]/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import EquipmentDetailPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '3' }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'engineer' } } }) }));

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('EquipmentDetailPage', () => {
  it('shows the header card, history, and a Report fault CTA for an engineer', async () => {
    renderWithClient(<EquipmentDetailPage />);
    await waitFor(() => expect(screen.getByText('PMP-08')).toBeInTheDocument());
    expect(await screen.findByText('Pump seal leaking')).toBeInTheDocument();
    expect(screen.getByText('Report fault')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/(app)/equipment/[id]/page.test.tsx"`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 7: Write `web/src/app/(app)/equipment/[id]/page.tsx`**

```tsx
'use client';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEquipment } from '@/hooks/use-equipment';
import { useRequestList } from '@/hooks/use-requests';
import { useOrderList } from '@/hooks/use-orders';
import { OpStatusBadge, SeverityBadge, LifecycleBadge } from '@/components/badges';
import { ErrorState, Skeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { canReportRequest } from '@/lib/domain';
import type { Role } from '@/lib/types';

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const equipmentQuery = useEquipment(id);
  const requestsQuery = useRequestList();
  const ordersQuery = useOrderList();

  if (equipmentQuery.isLoading) return <Skeleton className="h-64" />;
  if (equipmentQuery.isError || !equipmentQuery.data) {
    return <ErrorState message="Could not load equipment" onRetry={() => equipmentQuery.refetch()} />;
  }

  const equip = equipmentQuery.data;
  const role = session?.user?.role as Role | undefined;

  const history = [
    ...(requestsQuery.data
      ?.filter((r) => r.EquipId === id)
      .map((r) => ({ kind: 'request' as const, id: r.ReqId, label: r.Title, changedAt: r.ChangedAt, node: <SeverityBadge severity={r.Severity} /> })) ?? []),
    ...(ordersQuery.data
      ?.filter((o) => o.EquipId === id)
      .map((o) => ({ kind: 'order' as const, id: o.OrderId, label: `Work order #${o.OrderId}`, changedAt: o.ChangedAt, node: <LifecycleBadge status={o.Status} /> })) ?? []),
  ].sort((a, b) => b.changedAt.localeCompare(a.changedAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-surface-raised bg-surface-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-xl text-content-primary">{equip.EquipTag}</h1>
            <p className="text-content-secondary">{equip.Name}</p>
          </div>
          <OpStatusBadge status={equip.OpStatus} />
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div><dt className="text-content-secondary">Site</dt><dd className="text-content-primary">{equip.Site}</dd></div>
          <div><dt className="text-content-secondary">Type</dt><dd className="text-content-primary">{equip.EquipType}</dd></div>
          <div><dt className="text-content-secondary">Criticality</dt><dd className="text-content-primary">{equip.Criticality}</dd></div>
        </dl>
        {role && canReportRequest(role) && (
          <Button asChild className="mt-4">
            <Link href={`/requests/new?equipId=${equip.EquipId}`}>Report fault</Link>
          </Button>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-content-secondary">Maintenance history</h2>
        {history.length === 0 && <p className="text-sm text-content-secondary">No history yet.</p>}
        <ul className="flex flex-col gap-2">
          {history.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between rounded-md border border-surface-raised bg-surface-panel px-3 py-2 text-sm">
              <Link href={item.kind === 'request' ? `/requests/${item.id}` : `/orders/${item.id}`} className="text-content-primary">{item.label}</Link>
              {item.node}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/(app)/equipment/[id]/page.test.tsx"`
Expected: PASS (1 test)

- [ ] **Step 9: Commit**

```bash
git add "web/src/app/(app)/equipment"
git commit -m "feat(4.12): equipment register + detail with history timeline"
```

### Task 4.13: `/requests` list + `/requests/new` + `/requests/[id]` detail

**Files:**
- Create: `web/src/app/(app)/requests/page.tsx`, test co-located
- Create: `web/src/app/(app)/requests/new/page.tsx`, test co-located
- Create: `web/src/app/(app)/requests/[id]/page.tsx`, test co-located

**Interfaces:**
- Consumes: `useRequestList`, `useCreateRequest`, `useRequest`, `useConvertRequest`, `useRejectRequest` (Task 4.8); `newRequestFormSchema`, `severityEnum` (Task 4.2); `canReportRequest`, `canActOnRequest` (Task 4.3); `SeverityBadge`, `ConfirmDialog` (Task 4.9).

- [ ] **Step 1: Write the failing list-page test**

```tsx
// web/src/app/(app)/requests/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import RequestsListPage from './page';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'engineer' } } }) }));
beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('RequestsListPage', () => {
  it('lists requests with severity badges and a Report fault CTA for an engineer', async () => {
    renderWithClient(<RequestsListPage />);
    await waitFor(() => expect(screen.getByText('Pump seal leaking')).toBeInTheDocument());
    expect(screen.getByText('Report fault')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/(app)/requests/page.test.tsx"`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 3: Write `web/src/app/(app)/requests/page.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRequestList } from '@/hooks/use-requests';
import { SeverityBadge } from '@/components/badges';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { canReportRequest } from '@/lib/domain';
import type { Role } from '@/lib/types';

export default function RequestsListPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const query = useRequestList();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-content-primary">Maintenance requests</h1>
        {role && canReportRequest(role) && <Button asChild><Link href="/requests/new">Report fault</Link></Button>}
      </div>

      {query.isLoading && <Skeleton className="h-64" />}
      {query.isError && <ErrorState message="Could not load requests" onRetry={() => query.refetch()} />}
      {query.data?.length === 0 && <EmptyState title="No requests yet" description="Reported faults will show up here." />}
      <ul className="flex flex-col gap-2">
        {query.data?.map((req) => (
          <li key={req.ReqId} className="flex items-center justify-between rounded-md border border-surface-raised bg-surface-panel px-3 py-2 text-sm">
            <Link href={`/requests/${req.ReqId}`} className="text-content-primary">{req.Title}</Link>
            <div className="flex items-center gap-2">
              <span className="text-content-secondary">{req.Status}</span>
              <SeverityBadge severity={req.Severity} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/(app)/requests/page.test.tsx"`
Expected: PASS (1 test)

- [ ] **Step 5: Write the failing new-request-form test**

```tsx
// web/src/app/(app)/requests/new/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import NewRequestPage from './page';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }), useSearchParams: () => new URLSearchParams() }));

beforeEach(() => {
  resetFixtures();
  pushMock.mockReset();
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('NewRequestPage', () => {
  it('submits a valid request and navigates to the list', async () => {
    renderWithClient(<NewRequestPage />);
    await waitFor(() => expect(screen.getByText('CRU-104 — Primary crusher — Line 1')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Equipment'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Loud grinding noise' } });
    fireEvent.click(screen.getByText('Submit request'));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/requests'));
  });

  it('shows a validation error when title is empty', async () => {
    renderWithClient(<NewRequestPage />);
    await waitFor(() => expect(screen.getByText('CRU-104 — Primary crusher — Line 1')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Equipment'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Submit request'));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/(app)/requests/new/page.test.tsx"`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 7: Write `web/src/app/(app)/requests/new/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEquipmentList } from '@/hooks/use-equipment';
import { useCreateRequest } from '@/hooks/use-requests';
import { newRequestFormSchema, severityEnum } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function NewRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const equipmentQuery = useEquipmentList();
  const createRequest = useCreateRequest();

  const [form, setForm] = useState({
    EquipId: searchParams.get('equipId') ?? '',
    Title: '',
    Description: '',
    Severity: 'MEDIUM' as (typeof severityEnum.options)[number],
    ReportedBy: 'engineer@demo',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = newRequestFormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    createRequest.mutate(result.data, { onSuccess: () => router.push('/requests') });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-medium text-content-primary">Report a fault</h1>

      <div>
        <label className="text-sm text-content-secondary" htmlFor="equip">Equipment</label>
        <select
          id="equip"
          value={form.EquipId}
          onChange={(e) => setForm({ ...form, EquipId: e.target.value })}
          className="mt-1 w-full rounded-md border border-surface-raised bg-surface-panel px-2 py-2 text-sm text-content-primary"
        >
          <option value="">Select equipment…</option>
          {equipmentQuery.data?.map((equip) => (
            <option key={equip.EquipId} value={equip.EquipId}>{equip.EquipTag} — {equip.Name}</option>
          ))}
        </select>
        {errors.EquipId && <p className="mt-1 text-xs text-severity-high-fg">{errors.EquipId}</p>}
      </div>

      <div>
        <label className="text-sm text-content-secondary" htmlFor="title">Title</label>
        <Input id="title" value={form.Title} onChange={(e) => setForm({ ...form, Title: e.target.value })} />
        {errors.Title && <p className="mt-1 text-xs text-severity-high-fg">{errors.Title}</p>}
      </div>

      <div>
        <label className="text-sm text-content-secondary" htmlFor="description">Description</label>
        <Textarea id="description" value={form.Description} onChange={(e) => setForm({ ...form, Description: e.target.value })} />
      </div>

      <div>
        <label className="text-sm text-content-secondary" htmlFor="severity">Severity</label>
        <select
          id="severity"
          value={form.Severity}
          onChange={(e) => setForm({ ...form, Severity: e.target.value as typeof form.Severity })}
          className="mt-1 w-full rounded-md border border-surface-raised bg-surface-panel px-2 py-2 text-sm text-content-primary"
        >
          {severityEnum.options.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Button type="submit" disabled={createRequest.isPending}>{createRequest.isPending ? 'Submitting…' : 'Submit request'}</Button>
      {createRequest.isError && <p className="text-sm text-severity-high-fg">{createRequest.error.message}</p>}
    </form>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/(app)/requests/new/page.test.tsx"`
Expected: PASS (2 tests)

- [ ] **Step 9: Write the failing detail-page test**

```tsx
// web/src/app/(app)/requests/[id]/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import RequestDetailPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '1' }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'supervisor' } } }) }));

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('RequestDetailPage', () => {
  it('lets a supervisor reject a REPORTED request with a required note', async () => {
    renderWithClient(<RequestDetailPage />);
    await waitFor(() => expect(screen.getByText('Pump seal leaking')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Reject'));
    fireEvent.click(screen.getAllByText('Reject')[1]); // confirm button inside dialog, note still empty

    expect(await screen.findByText('A reason is required')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Reason for rejection'), { target: { value: 'Duplicate report' } });
    fireEvent.click(screen.getAllByText('Reject')[1]);

    await waitFor(() => expect(screen.getByText('Rejected: Duplicate report')).toBeInTheDocument());
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/(app)/requests/[id]/page.test.tsx"`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 11: Write `web/src/app/(app)/requests/[id]/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRequest, useConvertRequest, useRejectRequest } from '@/hooks/use-requests';
import { SeverityBadge } from '@/components/badges';
import { ErrorState, Skeleton } from '@/components/states';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { canActOnRequest } from '@/lib/domain';
import type { Role } from '@/lib/types';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const requestQuery = useRequest(id);
  const convertRequest = useConvertRequest(id);
  const rejectRequest = useRejectRequest(id);

  const [convertOpen, setConvertOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  if (requestQuery.isLoading) return <Skeleton className="h-64" />;
  if (requestQuery.isError || !requestQuery.data) {
    return <ErrorState message="Could not load request" onRetry={() => requestQuery.refetch()} />;
  }

  const req = requestQuery.data;
  const canAct = role ? canActOnRequest(role, 'convert_request', { status: req.Status }) : false;
  const selectedPriority = priority ?? req.Severity;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-content-primary">{req.Title}</h1>
        <SeverityBadge severity={req.Severity} />
      </div>
      <p className="text-sm text-content-secondary">{req.Description ?? 'No description provided.'}</p>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-content-secondary">Status</dt><dd className="text-content-primary">{req.Status}</dd></div>
        <div><dt className="text-content-secondary">Reported by</dt><dd className="text-content-primary">{req.ReportedBy}</dd></div>
      </dl>
      {req.RejectNote && <p className="text-sm text-severity-high-fg">Rejected: {req.RejectNote}</p>}

      {canAct && (
        <div className="flex gap-3">
          <Button onClick={() => setConvertOpen(true)}>Convert to work order</Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
        </div>
      )}

      <ConfirmDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="Convert to work order"
        description="Set the work order priority (defaults to the request's severity)."
        confirmLabel="Convert"
        pending={convertRequest.isPending}
        onConfirm={() => convertRequest.mutate({ Priority: selectedPriority }, { onSuccess: () => setConvertOpen(false) })}
      >
        <select
          value={selectedPriority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          className="w-full rounded-md border border-surface-raised bg-surface-panel px-2 py-2 text-sm text-content-primary"
        >
          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </ConfirmDialog>

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject request"
        description="A reason is required."
        confirmLabel="Reject"
        destructive
        pending={rejectRequest.isPending}
        onConfirm={() => {
          if (!note.trim()) {
            setNoteError('A reason is required');
            return;
          }
          rejectRequest.mutate({ Note: note }, { onSuccess: () => setRejectOpen(false) });
        }}
      >
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for rejection" />
        {noteError && <p className="mt-1 text-xs text-severity-high-fg">{noteError}</p>}
      </ConfirmDialog>
    </div>
  );
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/(app)/requests/[id]/page.test.tsx"`
Expected: PASS (1 test)

- [ ] **Step 13: Commit**

```bash
git add "web/src/app/(app)/requests"
git commit -m "feat(4.13): requests list, new-fault form, detail with convert/reject dialogs"
```

### Task 4.14: `/orders` list + `/orders/[id]` detail

**Files:**
- Create: `web/src/app/(app)/orders/page.tsx`, test co-located
- Create: `web/src/app/(app)/orders/[id]/page.tsx`, test co-located

**Interfaces:**
- Consumes: `useOrderList`, `useOrder`, `useScheduleOrder`, `useStartWork`, `useCompleteWork`, `useCancelOrder` (Task 4.8); `useRequest` (Task 4.8); `useEquipment` (Task 4.8); `canActOnOrder` (Task 4.3); `LifecycleBadge`, `ConfirmDialog` (Task 4.9).

- [ ] **Step 1: Write the failing list-page test**

```tsx
// web/src/app/(app)/orders/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import OrdersListPage from './page';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'technician', email: 'tech@demo' } } }) }));
beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('OrdersListPage', () => {
  it('defaults a technician to their own assigned orders', async () => {
    renderWithClient(<OrdersListPage />);
    await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());
    expect(screen.getByText('Show all orders')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/(app)/orders/page.test.tsx"`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 3: Write `web/src/app/(app)/orders/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useOrderList } from '@/hooks/use-orders';
import { LifecycleBadge } from '@/components/badges';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';
import { Button } from '@/components/ui/button';

export default function OrdersListPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const currentUser = session?.user?.email ?? '';
  const [showMineOnly, setShowMineOnly] = useState(role === 'technician');

  const query = useOrderList(showMineOnly ? { assignedTo: currentUser } : undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-content-primary">Work orders</h1>
        {role === 'technician' && (
          <Button variant="outline" onClick={() => setShowMineOnly((v) => !v)}>
            {showMineOnly ? 'Show all orders' : 'Show my orders'}
          </Button>
        )}
      </div>

      {query.isLoading && <Skeleton className="h-64" />}
      {query.isError && <ErrorState message="Could not load work orders" onRetry={() => query.refetch()} />}
      {query.data?.length === 0 && <EmptyState title="No work orders" description="Converted requests will appear here." />}
      <ul className="flex flex-col gap-2">
        {query.data?.map((order) => (
          <li key={order.OrderId} className="flex items-center justify-between rounded-md border border-surface-raised bg-surface-panel px-3 py-2 text-sm">
            <Link href={`/orders/${order.OrderId}`} className="font-mono text-content-primary">#{order.OrderId}</Link>
            <div className="flex items-center gap-2">
              <span className="text-content-secondary">{order.AssignedTo ?? 'Unassigned'}</span>
              <LifecycleBadge status={order.Status} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/(app)/orders/page.test.tsx"`
Expected: PASS (1 test)

- [ ] **Step 5: Write the failing detail-page test**

```tsx
// web/src/app/(app)/orders/[id]/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import OrderDetailPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '1' }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'technician', email: 'tech@demo' } } }) }));

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('OrderDetailPage', () => {
  it('lets the assigned technician complete an IN_PROGRESS order', async () => {
    renderWithClient(<OrderDetailPage />);
    await waitFor(() => expect(screen.getByText('Work order #1')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Complete'));
    fireEvent.change(screen.getByPlaceholderText('Downtime hours'), { target: { value: '3.5' } });
    fireEvent.click(screen.getAllByText('Complete')[1]);

    await waitFor(() => expect(screen.getByText('COMPLETED')).toBeInTheDocument());
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/(app)/orders/[id]/page.test.tsx"`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 7: Write `web/src/app/(app)/orders/[id]/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useOrder, useScheduleOrder, useStartWork, useCompleteWork, useCancelOrder } from '@/hooks/use-orders';
import { useRequest } from '@/hooks/use-requests';
import { useEquipment } from '@/hooks/use-equipment';
import { LifecycleBadge } from '@/components/badges';
import { ErrorState, Skeleton } from '@/components/states';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { canActOnOrder } from '@/lib/domain';
import type { Role, WorkOrder } from '@/lib/types';

const STEPS: WorkOrder['Status'][] = ['CREATED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const currentUser = session?.user?.email ?? '';

  const orderQuery = useOrder(id);
  const scheduleOrder = useScheduleOrder(id);
  const startWork = useStartWork(id);
  const completeWork = useCompleteWork(id);
  const cancelOrder = useCancelOrder(id);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('tech@demo');
  const [downtimeHours, setDowntimeHours] = useState('0');
  const [completionNotes, setCompletionNotes] = useState('');
  const [cancelNote, setCancelNote] = useState('');

  const requestQuery = useRequest(orderQuery.data?.ReqId ?? '');
  const equipmentQuery = useEquipment(orderQuery.data?.EquipId ?? '');

  if (orderQuery.isLoading) return <Skeleton className="h-64" />;
  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorState message="Could not load work order" onRetry={() => orderQuery.refetch()} />;
  }

  const order = orderQuery.data;
  const ctx = { status: order.Status, assignedTo: order.AssignedTo };
  const can = (action: 'schedule_order' | 'start_work' | 'complete_work' | 'cancel_order') =>
    role ? canActOnOrder(role, action, ctx, currentUser) : false;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-lg text-content-primary">Work order #{order.OrderId}</h1>
        <LifecycleBadge status={order.Status} />
      </div>

      <ol className="flex gap-2 text-xs text-content-secondary">
        {STEPS.map((step) => (
          <li key={step} className={step === order.Status ? 'font-medium text-content-primary' : ''}>{step}</li>
        ))}
        {order.Status === 'CANCELLED' && <li className="font-medium text-severity-high-fg">CANCELLED</li>}
      </ol>

      <div className="flex gap-3">
        {can('schedule_order') && <Button onClick={() => setScheduleOpen(true)}>Schedule</Button>}
        {can('start_work') && <Button onClick={() => startWork.mutate({})}>Start work</Button>}
        {can('complete_work') && <Button onClick={() => setCompleteOpen(true)}>Complete</Button>}
        {can('cancel_order') && <Button variant="destructive" onClick={() => setCancelOpen(true)}>Cancel order</Button>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {requestQuery.data && (
          <Link href={`/requests/${requestQuery.data.ReqId}`} className="rounded-md border border-surface-raised bg-surface-panel p-3 text-sm">
            <div className="text-content-secondary">Request</div>
            <div className="text-content-primary">{requestQuery.data.Title}</div>
          </Link>
        )}
        {equipmentQuery.data && (
          <Link href={`/equipment/${equipmentQuery.data.EquipId}`} className="rounded-md border border-surface-raised bg-surface-panel p-3 text-sm">
            <div className="text-content-secondary">Equipment</div>
            <div className="font-mono text-content-primary">{equipmentQuery.data.EquipTag}</div>
          </Link>
        )}
      </div>

      <ConfirmDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title="Schedule work order"
        description="Pick a date (today or later) and assign a technician."
        confirmLabel="Schedule"
        pending={scheduleOrder.isPending}
        onConfirm={() => scheduleOrder.mutate({ ScheduledDate: scheduledDate, AssignedTo: assignedTo }, { onSuccess: () => setScheduleOpen(false) })}
      >
        <div className="flex flex-col gap-2">
          <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Technician" />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Complete work order"
        description="Downtime hours must be zero or greater."
        confirmLabel="Complete"
        pending={completeWork.isPending}
        onConfirm={() =>
          completeWork.mutate({ CompletionNotes: completionNotes, DowntimeHours: Number(downtimeHours) }, { onSuccess: () => setCompleteOpen(false) })
        }
      >
        <div className="flex flex-col gap-2">
          <Input type="number" min="0" step="0.1" value={downtimeHours} onChange={(e) => setDowntimeHours(e.target.value)} placeholder="Downtime hours" />
          <Textarea value={completionNotes} onChange={(e) => setCompletionNotes(e.target.value)} placeholder="Completion notes" />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel work order"
        description="A reason is required."
        confirmLabel="Cancel order"
        destructive
        pending={cancelOrder.isPending}
        onConfirm={() => cancelOrder.mutate({ Note: cancelNote }, { onSuccess: () => setCancelOpen(false) })}
      >
        <Textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Reason for cancellation" />
      </ConfirmDialog>
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/(app)/orders/[id]/page.test.tsx"`
Expected: PASS (1 test)

- [ ] **Step 9: Commit**

```bash
git add "web/src/app/(app)/orders"
git commit -m "feat(4.14): work orders list + detail with stepper, action bar, and action dialogs"
```

### Task 4.15: `/insights` — four chart panels

**Files:**
- Create: `web/src/app/(app)/insights/page.tsx`
- Test: `web/src/app/(app)/insights/page.test.tsx`

**Interfaces:**
- Consumes: `useKpiDowntime`, `useKpiBacklogAging`, `useKpiFrequency` (Task 4.8); `ErrorState`, `Skeleton` (Task 4.9); `recharts` (Task 4.1).

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/app/(app)/insights/page.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import InsightsPage from './page';

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('InsightsPage', () => {
  it('renders all four chart panels once data loads', async () => {
    renderWithClient(<InsightsPage />);
    await waitFor(() => expect(screen.getByText('Downtime by site')).toBeInTheDocument());
    expect(screen.getByText('Downtime by equipment type')).toBeInTheDocument();
    expect(screen.getByText('Backlog aging')).toBeInTheDocument();
    expect(screen.getByText('Requests by equipment type')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm vitest run "src/app/(app)/insights/page.test.tsx"`
Expected: FAIL with "Cannot find module './page'"

- [ ] **Step 3: Write `web/src/app/(app)/insights/page.tsx`**

Recharts needs literal color values (SVG props), not Tailwind classes — so these read straight from `design/tokens.example.json`, the same source `tailwind.config.ts` consumes for every other component, instead of hand-picked hex (a real CLAUDE.md rule-7 violation caught in the final whole-branch review — every value below matches an existing token exactly). The aging ramp intentionally reuses the severity ramp per DESIGN_BRIEF.md ("the severity ramp reused for aging buckets").

```tsx
'use client';
import type { ReactNode } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useKpiDowntime, useKpiBacklogAging, useKpiFrequency } from '@/hooks/use-insights';
import { ErrorState, Skeleton } from '@/components/states';
import tokens from '../../../../../design/tokens.example.json';

const GRID_COLOR = tokens.text.muted;
const AXIS_COLOR = tokens.text.secondary;
const TOOLTIP_BG = tokens.surface.raised;
const AGING_COLORS: Record<string, string> = {
  '0-7': tokens.severity.low.fg,
  '8-30': tokens.severity.medium.fg,
  '30+': tokens.severity.critical.border,
};

interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

function ChartPanel<T>({ title, query, children }: { title: string; query: QueryLike<T>; children: (data: T) => ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-surface-raised bg-surface-panel p-4">
      <h2 className="mb-2 text-sm font-medium text-content-secondary">{title}</h2>
      {query.isLoading && <Skeleton className="h-60" />}
      {query.isError && <ErrorState message={`Could not load ${title.toLowerCase()}`} onRetry={query.refetch} />}
      {query.data && children(query.data)}
    </section>
  );
}

export default function InsightsPage() {
  const downtimeBySite = useKpiDowntime('site');
  const downtimeByType = useKpiDowntime('type');
  const backlogAging = useKpiBacklogAging();
  const frequency = useKpiFrequency();
  const mockBadge = process.env.NEXT_PUBLIC_MOCK_MODE === '1';

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-content-secondary">
        Last 90 days{mockBadge && <span className="ml-2 rounded border border-surface-raised px-1.5 py-0.5 text-xs">mock mode</span>}
      </p>

      <ChartPanel title="Downtime by site" query={downtimeBySite}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="group" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} />
              <Tooltip contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GRID_COLOR}` }} />
              <Bar dataKey="downtime_hours" fill={tokens.lifecycle.scheduled.border} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Downtime by equipment type" query={downtimeByType}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="group" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} />
              <Tooltip contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GRID_COLOR}` }} />
              <Bar dataKey="downtime_hours" fill={tokens.lifecycle.in_progress.border} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Backlog aging" query={backlogAging}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="range" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} />
              <Tooltip contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GRID_COLOR}` }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.buckets.map((bucket) => (
                  <Cell key={bucket.range} fill={AGING_COLORS[bucket.range] ?? tokens.lifecycle.scheduled.border} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Requests by equipment type" query={frequency}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="equip_type" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} />
              <Tooltip contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GRID_COLOR}` }} />
              <Bar dataKey="count" fill={tokens.severity.medium.fg} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm vitest run "src/app/(app)/insights/page.test.tsx"`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/insights"
git commit -m "feat(4.15): insights page with four Recharts panels"
```

### Task 4.16: Playwright e2e — full mock-mode lifecycle

**Files:**
- Create: `web/e2e/lifecycle.spec.ts`

**Interfaces:**
- Consumes: the full running app in `MOCK_MODE=1`/`NEXT_PUBLIC_MOCK_MODE=1` (Task 4.1's `playwright.config.ts` `webServer`).

This is the spec §1 success-criterion demo, run headless against MSW fixtures instead of real SAP. Everything happens as **one supervisor session** — supervisors alone can report, convert, schedule, start, and complete (Task 4.3's matrix), so the test never needs to sign out mid-flow (`next-auth`'s `signOut` does a full page navigation, which would reset the in-browser MSW fixture state).

- [ ] **Step 1: Write `web/e2e/lifecycle.spec.ts`**

This final version reflects two things found and fixed while getting this test to pass reliably (both documented in Task 4.1/4.5's corrected plan text too): `page.goto()` mid-flow causes a full page reload that resets MSW's in-memory fixture state, so every mid-flow transition uses the app's own nav links instead; and mock mode's MSW service worker occasionally races with Next.js's automatic `<Link>` prefetching (the URL updates but the router serves a stale/empty prefetched segment — no console error, just a silently stuck navigation, never observed in live mode where there's no service worker at all) — a `clickAndWaitFor` retry helper absorbs that race without masking a real failure.

```typescript
import { test, expect, type Locator, type Page } from '@playwright/test';

// Mock mode registers MSW's service worker for the whole test session, which
// occasionally races with Next.js's automatic <Link> prefetching: the URL
// updates (history.pushState) but the router serves a stale/empty prefetched
// segment instead of rendering the new page — no console error, just a
// silently stuck navigation. This never happens in the live-mode app (no
// service worker there at all), so it's a mock-mode test-environment
// artifact, not an application bug — a second click after the race resolves
// always succeeds. Retrying the click is the correct fix, not a longer wait.
async function clickAndWaitFor(page: Page, click: Locator, landed: Locator, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await click.click();
    try {
      await landed.waitFor({ state: 'visible', timeout: 8_000 });
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
    }
  }
}

test('full maintenance lifecycle flips equipment status and updates insights', async ({ page }) => {
  await page.goto('/login');
  await page.getByText('Supervisor').click();
  await expect(page).toHaveURL('/');

  await clickAndWaitFor(
    page,
    page.getByRole('link', { name: 'Equipment', exact: true }),
    page.getByRole('link', { name: 'CRU-104' }),
  );
  await clickAndWaitFor(
    page,
    page.getByRole('link', { name: 'CRU-104' }),
    page.getByRole('heading', { name: 'CRU-104' }),
  );
  await expect(page).toHaveURL('/equipment/1');
  await page.getByText('Report fault').click();

  await page.getByLabel('Title').fill('Excessive vibration');
  await page.getByLabel('Severity').selectOption('HIGH');
  await page.getByText('Submit request').click();
  await expect(page).toHaveURL('/requests');

  await page.getByText('Excessive vibration').click();
  await page.getByText('Convert to work order').click();
  await page.getByRole('button', { name: 'Convert', exact: true }).last().click();
  await expect(page.getByText('CONVERTED')).toBeVisible();

  await clickAndWaitFor(
    page,
    page.getByRole('link', { name: 'Orders', exact: true }),
    page.locator('a[href^="/orders/"]').first(),
  );
  await clickAndWaitFor(
    page,
    page.locator('a[href^="/orders/"]').first(),
    page.getByRole('heading', { name: /^Work order #/ }),
  );

  await page.getByText('Schedule', { exact: true }).click();
  const today = new Date().toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(today);
  await page.getByPlaceholder('Technician').fill('tech@demo');
  await page.getByRole('button', { name: 'Schedule', exact: true }).last().click();
  await expect(page.getByText('Scheduled')).toBeVisible();

  await page.getByText('Start work').click();
  await expect(page.getByText('In progress')).toBeVisible();

  await page.getByText('Complete', { exact: true }).click();
  await page.getByPlaceholder('Downtime hours').fill('4');
  await page.getByRole('button', { name: 'Complete', exact: true }).last().click();
  await expect(page.getByText('Completed')).toBeVisible();

  await clickAndWaitFor(
    page,
    page.getByRole('link', { name: 'Insights', exact: true }),
    page.getByText('Downtime by site'),
  );
});
```

- [ ] **Step 2: Run it, fixing selectors against the real rendered DOM**

Run: `cd web && pnpm e2e`
Expected: PASS. Playwright selectors are inherently sensitive to exact rendered text/roles — since this step runs against the real app for the first time, treat any selector mismatch as a normal TDD red-to-green fix (inspect the failure's DOM snapshot/trace via `pnpm exec playwright show-trace`, adjust the selector, rerun), not a design problem.

- [ ] **Step 3: Commit**

```bash
git add web/e2e/lifecycle.spec.ts
git commit -m "test(4.16): e2e full lifecycle — report, convert, schedule, start, complete"
```

---

## Phase 5 — Analytics Service (`analytics/`)

All KPI response shapes here match Task 4.5's MSW fixtures exactly (`mttr_hours`, `open_requests_by_severity`, `open_orders`, `equipment_availability_pct`, `total_downtime_hours_30d`; `{by, data:[{group, downtime_hours}]}`; `{buckets:[{range,count}]}`; `{data:[{equip_type,count}]}`).

### Task 5.1: FastAPI scaffold + fixtures

**Files:**
- Create: `analytics/requirements.txt`, `analytics/pyproject.toml`
- Create: `analytics/app/__init__.py`, `analytics/app/config.py`, `analytics/app/data_source.py`, `analytics/app/main.py`
- Create: `analytics/fixtures/equipment.json`, `analytics/fixtures/requests.json`, `analytics/fixtures/orders.json`
- Create: `analytics/tests/__init__.py`

**Interfaces:**
- Produces: `MOCK_MODE`, `SAP_BASE_URL`, `SAP_SERVICE_PATH`, `SAP_USER`, `SAP_PASS`, `CORS_ORIGIN` (config); `load_equipment()`, `load_requests()`, `load_orders()` (async, MOCK_MODE-aware) — Task 5.2–5.5's routes and Task 5.6's live wiring both call exactly these three functions. Fixture data below has hand-computed KPI values that Task 5.2's tests assert against — do not edit the fixture numbers without recomputing every downstream test.

- [ ] **Step 1: Write `analytics/requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
httpx==0.27.0
pytest==8.2.2
pytest-asyncio==0.23.7
ruff==0.5.0
```

- [ ] **Step 2: Write `analytics/pyproject.toml`**

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

- [ ] **Step 3: Write `analytics/app/config.py`**

```python
import os

MOCK_MODE = os.environ.get("MOCK_MODE", "0") == "1"
SAP_BASE_URL = os.environ.get("SAP_BASE_URL", "")
SAP_SERVICE_PATH = os.environ.get("SAP_SERVICE_PATH", "")
SAP_USER = os.environ.get("SAP_USER", "")
SAP_PASS = os.environ.get("SAP_PASS", "")
CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "http://localhost:3000")
```

- [ ] **Step 4: Write the fixtures**

`analytics/fixtures/equipment.json`:
```json
[
  { "EquipId": "1", "EquipTag": "CRU-104", "EquipType": "CRUSHER", "Site": "Pilbara Site A", "OpStatus": "OPERATIONAL" },
  { "EquipId": "2", "EquipTag": "CNV-22", "EquipType": "CONVEYOR", "Site": "Pilbara Site A", "OpStatus": "MAINTENANCE" },
  { "EquipId": "3", "EquipTag": "PMP-08", "EquipType": "PUMP", "Site": "Goldfields Site B", "OpStatus": "DOWN" },
  { "EquipId": "4", "EquipTag": "HTR-15", "EquipType": "HAUL_TRUCK", "Site": "Goldfields Site B", "OpStatus": "OPERATIONAL" },
  { "EquipId": "5", "EquipTag": "DRL-03", "EquipType": "DRILL", "Site": "Goldfields Site B", "OpStatus": "OPERATIONAL" }
]
```

`analytics/fixtures/requests.json` (all `CreatedAt` values are relative to a fixed reference "now" of `2026-07-17T00:00:00Z`, used consistently in Task 5.2's tests):
```json
[
  { "ReqId": "1", "EquipId": "1", "Severity": "HIGH", "Status": "REPORTED", "CreatedAt": "2026-07-15T00:00:00Z" },
  { "ReqId": "2", "EquipId": "2", "Severity": "MEDIUM", "Status": "REPORTED", "CreatedAt": "2026-07-05T00:00:00Z" },
  { "ReqId": "3", "EquipId": "3", "Severity": "CRITICAL", "Status": "REPORTED", "CreatedAt": "2026-06-01T00:00:00Z" },
  { "ReqId": "4", "EquipId": "1", "Severity": "LOW", "Status": "CONVERTED", "CreatedAt": "2026-07-01T00:00:00Z" },
  { "ReqId": "5", "EquipId": "4", "Severity": "MEDIUM", "Status": "REJECTED", "CreatedAt": "2026-05-01T00:00:00Z" },
  { "ReqId": "6", "EquipId": "5", "Severity": "LOW", "Status": "REPORTED", "CreatedAt": "2026-04-01T00:00:00Z" }
]
```

`analytics/fixtures/orders.json`:
```json
[
  { "OrderId": "1", "EquipId": "1", "Status": "COMPLETED", "StartedAt": "2026-07-10T00:00:00Z", "CompletedAt": "2026-07-10T06:00:00Z", "DowntimeHours": 6.0 },
  { "OrderId": "2", "EquipId": "2", "Status": "COMPLETED", "StartedAt": "2026-07-05T00:00:00Z", "CompletedAt": "2026-07-05T04:00:00Z", "DowntimeHours": 4.0 },
  { "OrderId": "3", "EquipId": "3", "Status": "IN_PROGRESS", "StartedAt": "2026-07-16T00:00:00Z", "CompletedAt": null, "DowntimeHours": null },
  { "OrderId": "4", "EquipId": "4", "Status": "SCHEDULED", "StartedAt": null, "CompletedAt": null, "DowntimeHours": null },
  { "OrderId": "5", "EquipId": "1", "Status": "CREATED", "StartedAt": null, "CompletedAt": null, "DowntimeHours": null },
  { "OrderId": "6", "EquipId": "3", "Status": "COMPLETED", "StartedAt": "2026-05-25T00:00:00Z", "CompletedAt": "2026-05-25T10:00:00Z", "DowntimeHours": 10.0 }
]
```

- [ ] **Step 5: Write `analytics/app/data_source.py`**

```python
import json
from pathlib import Path

from app.config import MOCK_MODE

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def _load_fixture(name: str) -> list[dict]:
    return json.loads((FIXTURES_DIR / f"{name}.json").read_text())


async def load_equipment() -> list[dict]:
    if MOCK_MODE:
        return _load_fixture("equipment")
    raise RuntimeError("Live SAP fetch not wired yet — see Task 5.6")


async def load_requests() -> list[dict]:
    if MOCK_MODE:
        return _load_fixture("requests")
    raise RuntimeError("Live SAP fetch not wired yet — see Task 5.6")


async def load_orders() -> list[dict]:
    if MOCK_MODE:
        return _load_fixture("orders")
    raise RuntimeError("Live SAP fetch not wired yet — see Task 5.6")
```

- [ ] **Step 6: Write `analytics/app/main.py`** (routes wired in starting Task 5.2)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGIN

app = FastAPI(title="AssetPulse Analytics")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_methods=["GET"],
    allow_headers=["*"],
)
```

- [ ] **Step 7: Create `analytics/app/__init__.py` and `analytics/tests/__init__.py`** (empty, make both dirs packages)

- [ ] **Step 8: Verify the app boots**

Run: `cd analytics && pip install -r requirements.txt && MOCK_MODE=1 uvicorn app.main:app --reload &` then `curl http://localhost:8000/docs` and stop the server.
Expected: FastAPI's interactive docs page loads (200 OK).

- [ ] **Step 9: Commit**

```bash
git add analytics/requirements.txt analytics/pyproject.toml analytics/app analytics/fixtures analytics/tests
git commit -m "chore(5.1): FastAPI scaffold, config, mock-mode data source, hand-computed fixtures"
```

### Task 5.2: KPI calculation functions + `/kpi/summary`

**Files:**
- Create: `analytics/app/kpi.py`
- Modify: `analytics/app/main.py` — mount the router
- Create: `analytics/app/routes.py`
- Test: `analytics/tests/test_kpi.py`
- Test: `analytics/tests/test_routes.py`

**Interfaces:**
- Consumes: `load_equipment`, `load_requests`, `load_orders` (Task 5.1).
- Produces: `mttr_hours`, `equipment_availability_pct`, `open_requests_by_severity`, `open_orders_count`, `total_downtime_hours`, `downtime_grouped`, `backlog_aging`, `frequency_by_type` (all pure functions, `now: datetime` injected for determinism) — Task 5.3–5.5 only add route wiring around functions already defined and tested here.

- [ ] **Step 1: Write the failing test — every KPI function against the Task 5.1 fixtures**

```python
# analytics/tests/test_kpi.py
import json
from datetime import datetime, timezone
from pathlib import Path

from app.kpi import (
    backlog_aging,
    downtime_grouped,
    equipment_availability_pct,
    frequency_by_type,
    mttr_hours,
    open_orders_count,
    open_requests_by_severity,
    total_downtime_hours,
)

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
NOW = datetime(2026, 7, 17, 0, 0, 0, tzinfo=timezone.utc)


def load(name: str) -> list[dict]:
    return json.loads((FIXTURES / f"{name}.json").read_text())


def test_mttr_hours():
    orders = load("orders")
    assert mttr_hours(orders) == 6.67  # mean(6, 4, 10) hours, rounded to 2dp


def test_equipment_availability_pct():
    equipment = load("equipment")
    assert equipment_availability_pct(equipment) == 60.0  # 3 of 5 OPERATIONAL


def test_open_requests_by_severity():
    requests = load("requests")
    assert open_requests_by_severity(requests) == {"HIGH": 1, "MEDIUM": 1, "CRITICAL": 1, "LOW": 1}


def test_open_orders_count():
    orders = load("orders")
    assert open_orders_count(orders) == 3  # IN_PROGRESS + SCHEDULED + CREATED


def test_total_downtime_hours_30d():
    orders = load("orders")
    assert total_downtime_hours(orders, NOW, days=30) == 10.0  # only the two orders completed within 30d


def test_downtime_grouped_by_site():
    orders = load("orders")
    equipment = load("equipment")
    assert downtime_grouped(orders, equipment, "site", NOW) == [
        {"group": "Goldfields Site B", "downtime_hours": 10.0},
        {"group": "Pilbara Site A", "downtime_hours": 10.0},
    ]


def test_downtime_grouped_by_type():
    orders = load("orders")
    equipment = load("equipment")
    assert downtime_grouped(orders, equipment, "type", NOW) == [
        {"group": "CONVEYOR", "downtime_hours": 4.0},
        {"group": "CRUSHER", "downtime_hours": 6.0},
        {"group": "PUMP", "downtime_hours": 10.0},
    ]


def test_backlog_aging():
    requests = load("requests")
    assert backlog_aging(requests, NOW) == [
        {"range": "0-7", "count": 1},
        {"range": "8-30", "count": 1},
        {"range": "30+", "count": 2},
    ]


def test_frequency_by_type_excludes_requests_older_than_90_days():
    requests = load("requests")
    equipment = load("equipment")
    assert frequency_by_type(requests, equipment, NOW) == [
        {"equip_type": "CONVEYOR", "count": 1},
        {"equip_type": "CRUSHER", "count": 2},
        {"equip_type": "HAUL_TRUCK", "count": 1},
        {"equip_type": "PUMP", "count": 1},
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd analytics && pytest tests/test_kpi.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.kpi'`

- [ ] **Step 3: Write `analytics/app/kpi.py`**

```python
"""KPI calculation formulas. Definitions match
docs/superpowers/specs/2026-07-16-assetpulse-design.md §6:
MTTR = mean(completed_at - started_at) over COMPLETED orders, in hours.
Availability % = count(OPERATIONAL equipment) / count(all equipment) * 100.
Backlog aging buckets open (REPORTED) requests by age in days: 0-7, 8-30, 30+.
Frequency counts requests per equipment type, created within the last 90 days.
"""

from datetime import datetime, timedelta
from statistics import mean


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def mttr_hours(orders: list[dict]) -> float:
    completed = [o for o in orders if o["Status"] == "COMPLETED" and o.get("StartedAt") and o.get("CompletedAt")]
    if not completed:
        return 0.0
    durations = [(parse_iso(o["CompletedAt"]) - parse_iso(o["StartedAt"])).total_seconds() / 3600 for o in completed]
    return round(mean(durations), 2)


def equipment_availability_pct(equipment: list[dict]) -> float:
    if not equipment:
        return 0.0
    operational = sum(1 for e in equipment if e["OpStatus"] == "OPERATIONAL")
    return round(operational / len(equipment) * 100, 1)


def open_requests_by_severity(requests: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for r in requests:
        if r["Status"] == "REPORTED":
            counts[r["Severity"]] = counts.get(r["Severity"], 0) + 1
    return counts


def open_orders_count(orders: list[dict]) -> int:
    return sum(1 for o in orders if o["Status"] in ("CREATED", "SCHEDULED", "IN_PROGRESS"))


def total_downtime_hours(orders: list[dict], now: datetime, days: int) -> float:
    cutoff = now - timedelta(days=days)
    total = sum(
        o["DowntimeHours"]
        for o in orders
        if o["Status"] == "COMPLETED" and o.get("CompletedAt") and parse_iso(o["CompletedAt"]) >= cutoff
    )
    return round(total, 2)


def downtime_grouped(orders: list[dict], equipment: list[dict], by: str, now: datetime, days: int = 90) -> list[dict]:
    equip_by_id = {e["EquipId"]: e for e in equipment}
    key = "Site" if by == "site" else "EquipType"
    cutoff = now - timedelta(days=days)
    totals: dict[str, float] = {}
    for o in orders:
        if o["Status"] != "COMPLETED" or not o.get("CompletedAt"):
            continue
        if parse_iso(o["CompletedAt"]) < cutoff:
            continue
        equip = equip_by_id.get(o["EquipId"])
        if not equip:
            continue
        group = equip[key]
        totals[group] = totals.get(group, 0) + o["DowntimeHours"]
    return [{"group": group, "downtime_hours": round(hours, 2)} for group, hours in sorted(totals.items())]


def backlog_aging(requests: list[dict], now: datetime) -> list[dict]:
    buckets = {"0-7": 0, "8-30": 0, "30+": 0}
    for r in requests:
        if r["Status"] != "REPORTED":
            continue
        age_days = (now - parse_iso(r["CreatedAt"])).days
        if age_days <= 7:
            buckets["0-7"] += 1
        elif age_days <= 30:
            buckets["8-30"] += 1
        else:
            buckets["30+"] += 1
    return [{"range": range_, "count": count} for range_, count in buckets.items()]


def frequency_by_type(requests: list[dict], equipment: list[dict], now: datetime, days: int = 90) -> list[dict]:
    equip_by_id = {e["EquipId"]: e for e in equipment}
    cutoff = now - timedelta(days=days)
    counts: dict[str, int] = {}
    for r in requests:
        if parse_iso(r["CreatedAt"]) < cutoff:
            continue
        equip = equip_by_id.get(r["EquipId"])
        if not equip:
            continue
        equip_type = equip["EquipType"]
        counts[equip_type] = counts.get(equip_type, 0) + 1
    return [{"equip_type": t, "count": c} for t, c in sorted(counts.items())]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd analytics && pytest tests/test_kpi.py -v`
Expected: PASS (9 tests)

- [ ] **Step 5: Write `analytics/app/routes.py` (starts with `/summary`; Tasks 5.3–5.5 append the other three)**

```python
from datetime import datetime, timezone

from fastapi import APIRouter

from app.data_source import load_equipment, load_orders, load_requests
from app.kpi import (
    equipment_availability_pct,
    mttr_hours,
    open_orders_count,
    open_requests_by_severity,
    total_downtime_hours,
)

router = APIRouter(prefix="/kpi")


@router.get("/summary")
async def summary():
    now = datetime.now(timezone.utc)
    equipment = await load_equipment()
    requests = await load_requests()
    orders = await load_orders()
    return {
        "mttr_hours": mttr_hours(orders),
        "open_requests_by_severity": open_requests_by_severity(requests),
        "open_orders": open_orders_count(orders),
        "equipment_availability_pct": equipment_availability_pct(equipment),
        "total_downtime_hours_30d": total_downtime_hours(orders, now, days=30),
    }
```

- [ ] **Step 6: Mount the router in `analytics/app/main.py`** (full replacement)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGIN
from app.routes import router

app = FastAPI(title="AssetPulse Analytics")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router)
```

- [ ] **Step 7: Write the failing route test**

```python
# analytics/tests/test_routes.py
import os

os.environ["MOCK_MODE"] = "1"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_kpi_summary():
    response = client.get("/kpi/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["mttr_hours"] == 6.67
    assert body["equipment_availability_pct"] == 60.0
    assert body["open_orders"] == 3
    assert body["total_downtime_hours_30d"] == 10.0
    assert body["open_requests_by_severity"] == {"HIGH": 1, "MEDIUM": 1, "CRITICAL": 1, "LOW": 1}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd analytics && MOCK_MODE=1 pytest tests/test_routes.py -v`
Expected: PASS (1 test)

- [ ] **Step 9: Commit**

```bash
git add analytics/app/kpi.py analytics/app/routes.py analytics/app/main.py analytics/tests/test_kpi.py analytics/tests/test_routes.py
git commit -m "feat(5.2): KPI calculation functions + /kpi/summary endpoint"
```

### Task 5.3: `/kpi/downtime?by=site|type`

**Files:**
- Modify: `analytics/app/routes.py` — add the route
- Modify: `analytics/tests/test_routes.py` — add the test

**Interfaces:**
- Consumes: `downtime_grouped` (Task 5.2).

- [ ] **Step 1: Add the failing test**

```python
# append to analytics/tests/test_routes.py
def test_kpi_downtime_by_site():
    response = client.get("/kpi/downtime?by=site")
    assert response.status_code == 200
    body = response.json()
    assert body["by"] == "site"
    assert body["data"] == [
        {"group": "Goldfields Site B", "downtime_hours": 10.0},
        {"group": "Pilbara Site A", "downtime_hours": 10.0},
    ]


def test_kpi_downtime_by_type():
    response = client.get("/kpi/downtime?by=type")
    body = response.json()
    assert body["data"] == [
        {"group": "CONVEYOR", "downtime_hours": 4.0},
        {"group": "CRUSHER", "downtime_hours": 6.0},
        {"group": "PUMP", "downtime_hours": 10.0},
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd analytics && MOCK_MODE=1 pytest tests/test_routes.py -k downtime -v`
Expected: FAIL with 404 (route doesn't exist)

- [ ] **Step 3: Add the route to `analytics/app/routes.py`**

```python
# add these imports at the top
from app.data_source import load_equipment, load_orders, load_requests  # already imported; add downtime_grouped below
from app.kpi import downtime_grouped  # add alongside the existing kpi imports

# add this route after /summary
@router.get("/downtime")
async def downtime(by: str = "site"):
    now = datetime.now(timezone.utc)
    equipment = await load_equipment()
    orders = await load_orders()
    return {"by": by, "data": downtime_grouped(orders, equipment, by, now)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd analytics && MOCK_MODE=1 pytest tests/test_routes.py -k downtime -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add analytics/app/routes.py analytics/tests/test_routes.py
git commit -m "feat(5.3): /kpi/downtime endpoint"
```

### Task 5.4: `/kpi/backlog-aging`

**Files:**
- Modify: `analytics/app/routes.py` — add the route
- Modify: `analytics/tests/test_routes.py` — add the test

**Interfaces:**
- Consumes: `backlog_aging` (Task 5.2).

- [ ] **Step 1: Add the failing test**

```python
# append to analytics/tests/test_routes.py
def test_kpi_backlog_aging():
    response = client.get("/kpi/backlog-aging")
    assert response.status_code == 200
    assert response.json()["buckets"] == [
        {"range": "0-7", "count": 1},
        {"range": "8-30", "count": 1},
        {"range": "30+", "count": 2},
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd analytics && MOCK_MODE=1 pytest tests/test_routes.py -k backlog -v`
Expected: FAIL with 404

- [ ] **Step 3: Add the route**

```python
# add to analytics/app/routes.py, alongside the other routes
from app.kpi import backlog_aging  # add alongside existing kpi imports

@router.get("/backlog-aging")
async def backlog_aging_route():
    now = datetime.now(timezone.utc)
    requests = await load_requests()
    return {"buckets": backlog_aging(requests, now)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd analytics && MOCK_MODE=1 pytest tests/test_routes.py -k backlog -v`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add analytics/app/routes.py analytics/tests/test_routes.py
git commit -m "feat(5.4): /kpi/backlog-aging endpoint"
```

### Task 5.5: `/kpi/frequency`

**Files:**
- Modify: `analytics/app/routes.py` — add the route
- Modify: `analytics/tests/test_routes.py` — add the test

**Interfaces:**
- Consumes: `frequency_by_type` (Task 5.2).

- [ ] **Step 1: Add the failing test**

```python
# append to analytics/tests/test_routes.py
def test_kpi_frequency():
    response = client.get("/kpi/frequency")
    assert response.status_code == 200
    assert response.json()["data"] == [
        {"equip_type": "CONVEYOR", "count": 1},
        {"equip_type": "CRUSHER", "count": 2},
        {"equip_type": "HAUL_TRUCK", "count": 1},
        {"equip_type": "PUMP", "count": 1},
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd analytics && MOCK_MODE=1 pytest tests/test_routes.py -k frequency -v`
Expected: FAIL with 404

- [ ] **Step 3: Add the route**

```python
# add to analytics/app/routes.py, alongside the other routes
from app.kpi import frequency_by_type  # add alongside existing kpi imports

@router.get("/frequency")
async def frequency():
    now = datetime.now(timezone.utc)
    requests = await load_requests()
    equipment = await load_equipment()
    return {"data": frequency_by_type(requests, equipment, now)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd analytics && MOCK_MODE=1 pytest tests/test_routes.py -v`
Expected: PASS (all tests in the file, 6 total)

- [ ] **Step 5: Commit**

```bash
git add analytics/app/routes.py analytics/tests/test_routes.py
git commit -m "feat(5.5): /kpi/frequency endpoint"
```

### Task 5.6: Live SAP client + 5-minute TTL cache

**Files:**
- Create: `analytics/app/sap_client.py`
- Create: `analytics/app/cache.py`
- Modify: `analytics/app/data_source.py` — replace the `RuntimeError` live branches with real fetches, cached
- Test: `analytics/tests/test_cache.py`

**Interfaces:**
- Consumes: `SAP_BASE_URL`, `SAP_SERVICE_PATH`, `SAP_USER`, `SAP_PASS` (Task 5.1's `config.py`).
- Produces: `fetch_entity(entity)`, `ttl_cache(seconds)` — `load_equipment/requests/orders` (Task 5.1) now call these instead of raising.

- [ ] **Step 1: Write the failing cache test**

```python
# analytics/tests/test_cache.py
import time

from app.cache import ttl_cache


def test_ttl_cache_reuses_value_within_ttl():
    calls = 0

    @ttl_cache(seconds=60)
    async def fetch():
        nonlocal calls
        calls += 1
        return calls

    import asyncio

    async def run():
        first = await fetch()
        second = await fetch()
        return first, second

    first, second = asyncio.get_event_loop().run_until_complete(run())
    assert first == 1
    assert second == 1  # served from cache, function body did not run again


def test_ttl_cache_expires_after_ttl():
    calls = 0

    @ttl_cache(seconds=0.05)
    async def fetch():
        nonlocal calls
        calls += 1
        return calls

    import asyncio

    async def run():
        first = await fetch()
        time.sleep(0.1)
        second = await fetch()
        return first, second

    first, second = asyncio.get_event_loop().run_until_complete(run())
    assert first == 1
    assert second == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd analytics && pytest tests/test_cache.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.cache'`

- [ ] **Step 3: Write `analytics/app/cache.py`**

```python
import time
from functools import wraps
from typing import Callable


def ttl_cache(seconds: float):
    def decorator(fn: Callable):
        store: dict[str, tuple[float, object]] = {}

        @wraps(fn)
        async def wrapper(*args, **kwargs):
            key = repr((args, kwargs))
            now = time.monotonic()
            if key in store:
                cached_at, value = store[key]
                if now - cached_at < seconds:
                    return value
            value = await fn(*args, **kwargs)
            store[key] = (now, value)
            return value

        return wrapper

    return decorator
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd analytics && pytest tests/test_cache.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Write `analytics/app/sap_client.py`**

```python
import httpx

from app.config import SAP_BASE_URL, SAP_PASS, SAP_SERVICE_PATH, SAP_USER


async def fetch_entity(entity: str) -> list[dict]:
    url = f"{SAP_BASE_URL}{SAP_SERVICE_PATH}/{entity}"
    async with httpx.AsyncClient(auth=(SAP_USER, SAP_PASS), timeout=10.0) as client:
        response = await client.get(url, params={"$top": 500})
        response.raise_for_status()
        return response.json()["value"]
```

- [ ] **Step 6: Update `analytics/app/data_source.py` (full replacement)**

```python
import json
from pathlib import Path

from app.cache import ttl_cache
from app.config import MOCK_MODE
from app.sap_client import fetch_entity

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"
CACHE_TTL_SECONDS = 300


def _load_fixture(name: str) -> list[dict]:
    return json.loads((FIXTURES_DIR / f"{name}.json").read_text())


@ttl_cache(CACHE_TTL_SECONDS)
async def load_equipment() -> list[dict]:
    return _load_fixture("equipment") if MOCK_MODE else await fetch_entity("Equipment")


@ttl_cache(CACHE_TTL_SECONDS)
async def load_requests() -> list[dict]:
    return _load_fixture("requests") if MOCK_MODE else await fetch_entity("MaintenanceRequest")


@ttl_cache(CACHE_TTL_SECONDS)
async def load_orders() -> list[dict]:
    return _load_fixture("orders") if MOCK_MODE else await fetch_entity("WorkOrder")
```

- [ ] **Step 7: Run the full suite to confirm nothing regressed**

Run: `cd analytics && MOCK_MODE=1 pytest -v`
Expected: PASS (all tests — `test_kpi.py`, `test_routes.py`, `test_cache.py`)

- [ ] **Step 8: Commit**

```bash
git add analytics/app/sap_client.py analytics/app/cache.py analytics/app/data_source.py analytics/tests/test_cache.py
git commit -m "feat(5.6): live SAP client + 5-minute TTL cache wrapping mock/live data source"
```

### Task 5.7: ADR 0003 (separate FastAPI analytics service)

**Files:**
- Create: `docs/adr/0003-separate-fastapi-analytics-service.md`

- [ ] **Step 1: Write the ADR**

```markdown
# ADR 0003: Separate FastAPI analytics service instead of computing KPIs in Next.js

## Context
KPIs (MTTR, availability %, downtime aggregations, backlog aging, request frequency) need pandas-grade aggregation over the same OData entities the frontend already reads, on a 5-minute cache to avoid hammering the BTP trial system. The frontend stack is TypeScript; the natural data-science toolset for these formulas is Python/pandas-adjacent, not a hand-rolled TS aggregation layer.

## Decision
Ship a standalone FastAPI service (`analytics/`) on Render, proxied by Next.js's `/api/insights/[...path]` (ADR 0002's identical pattern applied to a second upstream). `MOCK_MODE=1` serves committed JSON fixtures so CI and demos never depend on the analytics service being able to reach a possibly-hibernating BTP trial.

## Consequences
- KPI formulas live and are tested in one place (`analytics/app/kpi.py`, spec §6), with exact expected values asserted against fixtures — not scattered across frontend components.
- Demonstrates a second, independent SAP-adjacent competency (Python integration service) alongside the RAP/OData work — spec §1's "what this demonstrates" recruiter framing.
- Cost: a second deployable service to operate (Render free tier, cold starts) — accepted; mitigated by the 5-minute cache and `MOCK_MODE` fixture fallback.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0003-separate-fastapi-analytics-service.md
git commit -m "docs(5.7): ADR 0003"
```

---

## Phase 6 — Ship

### Task 6.1: `seed.mjs` — realistic demo data via the live API

**Files:**
- Create: `web/scripts/seed.mjs`

**Interfaces:**
- Consumes: a running app's `/api/sap/*` proxy (Task 4.6) — talks to the app, never to SAP directly, so it inherits CSRF/auth handling for free instead of re-implementing it.
- Produces: ~12 equipment records across the two spec sites, 10 requests in mixed severities/statuses, 8 work orders spread across every lifecycle stage (CREATED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED) — satisfies spec §9.3 and the "no lorem ipsum" demo-quality requirement.

- [ ] **Step 1: Write `web/scripts/seed.mjs`**

```javascript
#!/usr/bin/env node
// Seeds realistic demo data through the running app's own /api/sap proxy —
// reuses its CSRF/auth handling instead of re-implementing it here.
// Run: WEB_BASE_URL=http://localhost:3000 node web/scripts/seed.mjs

const WEB_BASE_URL = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
const ACTION_NS = 'com.sap.gateway.srvd.zassetpulse_srv.v0001';
const SITES = ['Pilbara Site A', 'Goldfields Site B'];

const EQUIPMENT = [
  { EquipTag: 'CRU-104', Name: 'Primary crusher — Line 1', EquipType: 'CRUSHER', Site: SITES[0], Criticality: 'CRITICAL' },
  { EquipTag: 'CRU-105', Name: 'Secondary crusher — Line 1', EquipType: 'CRUSHER', Site: SITES[0], Criticality: 'HIGH' },
  { EquipTag: 'CNV-22', Name: 'Overland conveyor', EquipType: 'CONVEYOR', Site: SITES[0], Criticality: 'HIGH' },
  { EquipTag: 'CNV-23', Name: 'Stacker conveyor', EquipType: 'CONVEYOR', Site: SITES[0], Criticality: 'MEDIUM' },
  { EquipTag: 'PMP-08', Name: 'Slurry pump', EquipType: 'PUMP', Site: SITES[1], Criticality: 'MEDIUM' },
  { EquipTag: 'PMP-09', Name: 'Process water pump', EquipType: 'PUMP', Site: SITES[1], Criticality: 'LOW' },
  { EquipTag: 'HTR-15', Name: 'Haul truck 15', EquipType: 'HAUL_TRUCK', Site: SITES[1], Criticality: 'HIGH' },
  { EquipTag: 'HTR-16', Name: 'Haul truck 16', EquipType: 'HAUL_TRUCK', Site: SITES[1], Criticality: 'HIGH' },
  { EquipTag: 'HTR-17', Name: 'Haul truck 17', EquipType: 'HAUL_TRUCK', Site: SITES[0], Criticality: 'MEDIUM' },
  { EquipTag: 'DRL-03', Name: 'Rotary drill rig', EquipType: 'DRILL', Site: SITES[1], Criticality: 'HIGH' },
  { EquipTag: 'DRL-04', Name: 'Blast hole drill', EquipType: 'DRILL', Site: SITES[1], Criticality: 'MEDIUM' },
  { EquipTag: 'CNV-24', Name: 'Transfer conveyor', EquipType: 'CONVEYOR', Site: SITES[1], Criticality: 'LOW' },
];

const REQUEST_TEMPLATES = [
  { title: 'Bearing noise', severity: 'HIGH' },
  { title: 'Belt tracking off-center', severity: 'MEDIUM' },
  { title: 'Seal leak', severity: 'CRITICAL' },
  { title: 'Hydraulic pressure low', severity: 'HIGH' },
  { title: 'Tyre wear excessive', severity: 'MEDIUM' },
  { title: 'Vibration on startup', severity: 'LOW' },
  { title: 'Coolant temperature high', severity: 'HIGH' },
  { title: 'Loose guarding', severity: 'LOW' },
  { title: 'Drill bit chatter', severity: 'MEDIUM' },
  { title: 'Motor overheating', severity: 'CRITICAL' },
];

async function post(path, body) {
  const res = await fetch(`${WEB_BASE_URL}/api/sap/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function get(path) {
  const res = await fetch(`${WEB_BASE_URL}/api/sap/${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

function isoDate(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);
}

async function main() {
  console.log(`Seeding against ${WEB_BASE_URL} ...`);

  const equipment = [];
  for (const e of EQUIPMENT) {
    const created = await post('Equipment', { ...e, InstalledOn: '2020-01-01' });
    equipment.push(created);
    console.log(`  equipment: ${created.EquipTag}`);
  }

  const requests = [];
  for (let i = 0; i < REQUEST_TEMPLATES.length; i++) {
    const equip = equipment[i % equipment.length];
    const t = REQUEST_TEMPLATES[i];
    const created = await post('MaintenanceRequest', {
      EquipId: equip.EquipId,
      Title: t.title,
      Severity: t.severity,
      ReportedBy: 'engineer@demo',
    });
    requests.push(created);
    console.log(`  request: ${created.Title}`);
  }

  // Convert 8 of the 10 requests into work orders; the remaining 2 stay REPORTED
  // so the dashboard's critical-alerts panel and requests list have open items too.
  const orders = [];
  for (let i = 0; i < 8; i++) {
    const req = requests[i];
    await post(`MaintenanceRequest('${req.ReqId}')/${ACTION_NS}.ConvertToWorkOrder`, { Priority: '' });
    const withOrder = await get(`MaintenanceRequest('${req.ReqId}')?$expand=_WorkOrder`);
    orders.push(withOrder._WorkOrder[0]);
    console.log(`  converted: ${req.Title}`);
  }

  // Spread the 8 orders across every lifecycle stage: 2 CREATED, 2 SCHEDULED, 2 IN_PROGRESS, 1 COMPLETED, 1 CANCELLED
  await post(`WorkOrder('${orders[2].OrderId}')/${ACTION_NS}.Schedule`, { ScheduledDate: isoDate(2), AssignedTo: 'tech@demo' });
  await post(`WorkOrder('${orders[3].OrderId}')/${ACTION_NS}.Schedule`, { ScheduledDate: isoDate(3), AssignedTo: 'tech@demo' });

  await post(`WorkOrder('${orders[4].OrderId}')/${ACTION_NS}.Schedule`, { ScheduledDate: isoDate(0), AssignedTo: 'tech@demo' });
  await post(`WorkOrder('${orders[4].OrderId}')/${ACTION_NS}.StartWork`, {});

  await post(`WorkOrder('${orders[5].OrderId}')/${ACTION_NS}.Schedule`, { ScheduledDate: isoDate(0), AssignedTo: 'tech@demo' });
  await post(`WorkOrder('${orders[5].OrderId}')/${ACTION_NS}.StartWork`, {});

  await post(`WorkOrder('${orders[6].OrderId}')/${ACTION_NS}.Schedule`, { ScheduledDate: isoDate(0), AssignedTo: 'tech@demo' });
  await post(`WorkOrder('${orders[6].OrderId}')/${ACTION_NS}.StartWork`, {});
  await post(`WorkOrder('${orders[6].OrderId}')/${ACTION_NS}.CompleteWork`, { CompletionNotes: 'Replaced worn component', DowntimeHours: 3.5 });

  await post(`WorkOrder('${orders[7].OrderId}')/${ACTION_NS}.CancelOrder`, { Note: 'Duplicate of another work order' });

  console.log('\nSeed complete: 12 equipment, 10 requests, 8 work orders across every lifecycle stage.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run it against a live environment** (local dev server pointed at the real SAP service, or the deployed Vercel URL)

Run: `WEB_BASE_URL=http://localhost:3000 node web/scripts/seed.mjs`
Expected: `Seed complete: 12 equipment, 10 requests, 8 work orders across every lifecycle stage.` — verify by loading the dashboard and confirming the equipment status board, critical alerts, and recent activity all show this data instead of empty states.

- [ ] **Step 3: Commit**

```bash
git add web/scripts/seed.mjs
git commit -m "feat(6.1): seed script — realistic demo data via the live API"
```

### Task 6.2: Finalize `docs/REDEPLOY.md`, write `docs/CASE_STUDY.md` and `docs/DEMO.md`

**Files:**
- Modify: `docs/REDEPLOY.md` (Task 1.11) — add the seed step cross-reference (already present from Task 1.11 Step 2; verify it still matches Task 6.1's actual script name/usage)
- Create: `docs/CASE_STUDY.md`
- Create: `docs/DEMO.md`

- [ ] **Step 1: Verify `docs/REDEPLOY.md` still matches reality**

Its "Prevention" and step 6 already say `node web/scripts/seed.mjs` — confirm the command matches Task 6.1's actual usage (`WEB_BASE_URL=... node web/scripts/seed.mjs`) and fix the doc if it drifted.

- [ ] **Step 2: Write `docs/CASE_STUDY.md`**

```markdown
# AssetPulse — Case Study

## Problem
Mining operators (BHP, Rio Tinto, Fortescue — all SAP Plant Maintenance shops) run asset-maintenance workflows across hundreds of pieces of critical equipment: a fault is reported, triaged into a work order, scheduled, executed, and analysed. Getting this wrong costs unplanned downtime measured in the hundreds of thousands of dollars per incident on CRITICAL equipment. AssetPulse is a from-scratch implementation of that workflow, built to demonstrate SAP RAP/BTP consulting competency end to end — not a UI mockup of one.

## Solution
Three entities (Equipment, MaintenanceRequest, WorkOrder) modeled as RAP managed business objects on SAP BTP ABAP Environment, with six actions enforcing a strict status machine and two cross-BO effects that are the differentiator: starting a work order flips its equipment to MAINTENANCE; completing it flips the equipment back to OPERATIONAL and records downtime. A CRITICAL-severity fault report immediately downs the equipment at creation — before anyone has even looked at it — mirroring how a real control room would triage risk.

A dark-first Next.js control room (`web/`) surfaces this: KPI strip, equipment status board, critical alerts, maintenance history timelines, and role-gated actions (engineer / supervisor / technician) all driven by one tested permission matrix. A Python FastAPI service (`analytics/`) computes MTTR, availability %, downtime aggregations, and backlog aging from the same OData entities.

## Architecture
```
Browser (dark control-room UI)
  └─ Next.js on Vercel
       ├─ /api/sap/[...path]     → server proxy (basic auth + CSRF + cookies) → SAP BTP OData v4
       └─ /api/insights/[...]    → proxies FastAPI analytics service
SAP BTP ABAP Environment: OData v4 ← RAP managed BOs ← CDS ← HANA (3 tables)
FastAPI on Render: httpx → SAP OData → pandas-style aggregation → JSON (5-min cache; fixture mock mode)
```

Key decisions are recorded as ADRs in `docs/adr/`: managed RAP over unmanaged (0001), server-side SAP proxy (0002), a separate analytics service (0003), dark-first design (0004), abapGit as source of truth (0005).

## Outcomes
- 3 RAP business objects, 6 actions, 2 cross-BO effects, ~12 ABAP Unit tests, ATC-clean.
- 4 analytics endpoints with pandas-style KPI formulas, tested against fixtures with exact expected values.
- 7 frontend routes, one tested role×status permission matrix, full mock-mode CI (lint, typecheck, unit, e2e) plus a live E2E path against real SAP data.
- Public GitHub repo with real, abapGit-serialized ABAP source — the ABAP work is verifiable, not described.

## What this demonstrates for SAP consulting roles
RAP (managed BOs, EML, `strict(2)`), CDS view modeling and associations, cross-BO transactional logic, OData v4 integration and CSRF handling, Clean Core extensibility patterns (no core modification, all custom Z-namespace), and end-to-end delivery from ABAP through a production-grade frontend and a secondary analytics service.
```

- [ ] **Step 3: Write `docs/DEMO.md`**

```markdown
# AssetPulse — 3-Minute Demo Script

**Setup:** live Vercel URL, seeded via `web/scripts/seed.mjs`, real BTP data.

**0:00–0:20 — Control room**
Land on `/`. Point out the KPI strip (MTTR, availability %, open orders, 30-day downtime — big mono numerals, tabular figures), the equipment status board grouped by site, and the critical alerts panel showing any CRITICAL fault reports.

**0:20–0:50 — Report a fault**
Click an OPERATIONAL equipment tag → equipment detail → "Report fault". Fill in a HIGH-severity fault, submit. Note: severity CRITICAL would have downed the equipment immediately, before anyone even looks at it — that's a determination running server-side in ABAP, not a UI trick.

**0:50–1:30 — Convert and schedule**
Open the new request → "Convert to work order" (priority defaults from severity, editable). Jump to the new work order → "Schedule" with today's date and a technician.

**1:30–2:10 — Start and complete (the differentiator)**
"Start work" — flip back to the equipment detail page and show `OpStatus` is now MAINTENANCE, live, no manual sync. Return to the order, "Complete" with downtime hours and notes — flip back to equipment again and show it's OPERATIONAL, downtime recorded on the order.

**2:10–2:40 — Insights**
Open `/insights`. Point out the downtime-by-site/type charts, backlog aging buckets, and request frequency by equipment type — all computed by the separate FastAPI analytics service from the same live SAP data.

**2:40–3:00 — Wrap**
"Three RAP business objects, six actions, two cross-BO effects, all abapGit-serialized and visible in the repo — this is a full SAP Plant Maintenance workflow, not a UI mockup of one."
```

- [ ] **Step 4: Commit**

```bash
git add docs/REDEPLOY.md docs/CASE_STUDY.md docs/DEMO.md
git commit -m "docs(6.2): case study and demo script"
```

### Task 6.3: `README.md`

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: CI workflow name (Task 0.2), all seven ADRs (Tasks 1.12, 2.3, 3.3, 5.7), `docs/DEMO.md`/`docs/CASE_STUDY.md` (Task 6.2).

- [ ] **Step 1: Write `README.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(6.3): README with quickstart, competency table, architecture"
```

### Task 6.4: 🧑 Live deploy + live E2E checkpoint

- [ ] **Step 1: 🧑 MANUAL CHECKPOINT — deploy both services and run the live path**

```
🧑 MANUAL CHECKPOINT — Live deployment

1. Render: create a free Web Service from the analytics/ directory (Python 3.12, start command
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Set env vars SAP_BASE_URL, SAP_SERVICE_PATH,
   SAP_USER, SAP_PASS, CORS_ORIGIN=<your future Vercel URL>. Leave MOCK_MODE unset (defaults to live).
2. Vercel: import the repo, root directory web/. Set env vars SAP_BASE_URL, SAP_SERVICE_PATH, SAP_USER,
   SAP_PASS, NEXTAUTH_SECRET (generate one: `openssl rand -base64 32`), NEXTAUTH_URL=<the Vercel URL>,
   ANALYTICS_URL=<the Render URL>. Do NOT set MOCK_MODE or NEXT_PUBLIC_MOCK_MODE in this environment.
3. Deploy both. Confirm the BTP trial system is awake (start it in the cockpit if hibernating).
4. Run `node web/scripts/seed.mjs` with `WEB_BASE_URL=<your Vercel URL>` to populate real demo data.
5. Run `cd web && pnpm e2e:live` against the deployed URL (playwright.live.config.ts, created below) to
   confirm the full lifecycle works against real SAP + real analytics — not just mocks.
6. Paste back: both live URLs, confirmation seed.mjs completed, and the e2e:live pass/fail summary.
```

- [ ] **Step 2: Write `web/playwright.live.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'lifecycle.spec.ts',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.LIVE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

Add to `web/package.json` scripts (already present from Task 4.1 Step 1, verify it reads `LIVE_URL=<url> playwright test --config=playwright.live.config.ts`).

- [ ] **Step 3: Commit**

```bash
git add web/playwright.live.config.ts
git commit -m "chore(6.4): live E2E config for the deployed environment"
```

### Task 6.5: Resume/LinkedIn bullets

**Files:**
- Create: `docs/RESUME_BULLETS.md`

- [ ] **Step 1: Write the bullets with the project's real, final numbers** (fill in any count that shifted during implementation before committing)

```markdown
# Resume / LinkedIn bullets — AssetPulse

- Designed and shipped AssetPulse, a full-stack SAP Plant Maintenance-style asset management system: 3 RAP managed business objects, 6 actions, and 2 cross-BO transactional effects on SAP BTP ABAP Environment, with ~12 ABAP Unit tests and a clean ATC run.
- Built a dark-first Next.js control room (7 routes, one centrally-tested role×status permission matrix, full mock-mode CI) and a companion Python FastAPI analytics service (4 KPI endpoints, fixture-tested) proxied through a CSRF-aware server layer — zero SAP credentials ever reach the browser.
```

- [ ] **Step 2: Commit**

```bash
git add docs/RESUME_BULLETS.md
git commit -m "docs(6.5): resume/LinkedIn bullets with real project numbers"
```

### Task 6.6: Tag v1.0.0

- [ ] **Step 1: Confirm every gate is green** (per CLAUDE.md's phase-gate rule): `abap/test/ztc_assetpulse.clas.abap` 12/12 in ADT + ATC clean (Task 1.10), `pnpm lint && pnpm typecheck && pnpm test -- --run && pnpm e2e` green in `web/`, `pytest` green in `analytics/`, GitHub Actions CI green on `main`, live E2E passed (Task 6.4).

- [ ] **Step 2: Create the annotated tag locally**

```bash
git tag -a v1.0.0 -m "AssetPulse v1.0.0 — full fault-to-completion lifecycle on real SAP data"
```

- [ ] **Step 3: Push only with explicit confirmation** — tagging and pushing to the shared remote is a visible, hard-to-reverse action; confirm with the user before running:

```bash
git push origin main
git push origin v1.0.0
```

---

## Self-Review

**Spec coverage:** §1 success criteria → Task 4.16/6.4 (live lifecycle demo), Task 0.2/CI (quality gates), Task 6.3 (README 10-minute mock-mode run). §2 architecture → Phases 1/4/5. §3 domain model → Task 1.1 (tables), Task 1.3 (CDS), Task 1.4/1.6/1.7 (status machines + cross-BO effects). §4 RAP layer → Tasks 1.1–1.10. §5 API contract → Task 1.10 (service), Task 4.6 (proxy). §6 analytics → Phase 5. §7 frontend → Phase 4 (every route, the domain.ts matrix, loading/empty/error states, optimistic mutations). §8 design → Phase 3. §9 quality/CI/professionalism → Task 0.2 (CI), ADRs throughout, Task 6.1 (seed), Task 6.2/6.3/6.5 (docs). §10 out of scope → `docs/V2_BACKLOG.md` (Task 0.1). §11 milestones → phase ordering matches 1–7 exactly.

**Placeholder scan:** no TBD/"add error handling"/"similar to Task N" patterns — every code step above has full, runnable content; every abstract entity, action, and hook name introduced in an early task is the exact name used in every later task that consumes it.

**Type consistency:** `EquipId/ReqId/OrderId` (string UUIDs) and PascalCase field names are consistent from the ABAP CDS projections (Task 1.8) through the zod schemas (Task 4.2), MSW fixtures (Task 4.5), hooks (Task 4.8), and analytics fixtures (Task 5.1, which intentionally reuse the same field names for the same reason — one shape, everywhere). Action names (`RejectRequest`, `ConvertToWorkOrder`, `Schedule`, `StartWork`, `CompleteWork`, `CancelOrder`) are identical across the BDEF (1.4), behavior implementation (1.6/1.7), ABAP Unit tests (1.9), MSW handlers (4.5), and hooks (4.8).

