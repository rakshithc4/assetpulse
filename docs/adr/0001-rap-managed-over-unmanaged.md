# ADR 0001: RAP managed business objects over unmanaged

## Context
AssetPulse's three entities (Equipment, MaintenanceRequest, WorkOrder) need CRUD, managed numbering, optimistic concurrency (etag), and a handful of status-transition actions with validations and determinations. RAP offers both managed and unmanaged BO patterns.

## Decision
Use managed RAP business objects (`managed implementation in class ... unique;`) with `strict(2)`, managed UUID key numbering, and `etag master ChangedAt` for all three roots, implementing only the actions/determinations/validations the status machine actually needs.

## Consequences
- Framework handles create/update persistence, draft-free transactional buffering, and locking — no hand-written `INSERT`/`UPDATE` SQL, satisfying the "EML only, no direct UPDATE dbtab" rule.
- `strict(2)` catches unauthorized field changes and unknown associations at compile-adjacent time rather than runtime, which matters more once cross-BO EML is involved (Task 1.6/1.7).
- Cost: less control over exact SQL than unmanaged — acceptable, since none of the three entities need custom persistence logic.
