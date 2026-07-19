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
