# ADR 0002: Server-side proxy for SAP authentication

## Context
The published OData v4 service authenticates via a communication user's basic-auth credentials. The browser must never see `SAP_USER`/`SAP_PASS`, and OData v4 writes additionally require an `x-csrf-token` fetched from a prior GET and its session cookie replayed on the write — a two-request dance that's easy to get wrong per-caller.

## Decision
All SAP traffic routes through one Next.js route handler, `web/src/app/api/sap/[...path]/route.ts` (Task 4.6). It holds the basic-auth header and CSRF/cookie handling centrally; the browser only ever calls same-origin `/api/sap/*`.

## Consequences
- Credentials never reach client JS, satisfying the "no SAP calls from the browser" rule.
- CSRF token fetch + cookie replay is implemented exactly once, not duplicated per feature — the class of bug CLAUDE.md's SAP gotchas section warns about.
- Cost: one extra network hop (browser → Vercel → BTP) versus calling SAP directly — acceptable, matches the analytics service's identical proxy pattern (ADR 0003).
