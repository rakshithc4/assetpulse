# ADR 0003: Separate FastAPI analytics service instead of computing KPIs in Next.js

## Context
KPIs (MTTR, availability %, downtime aggregations, backlog aging, request frequency) need pandas-grade aggregation over the same OData entities the frontend already reads, on a 5-minute cache to avoid hammering the BTP trial system. The frontend stack is TypeScript; the natural data-science toolset for these formulas is Python/pandas-adjacent, not a hand-rolled TS aggregation layer.

## Decision
Ship a standalone FastAPI service (`analytics/`) on Render, proxied by Next.js's `/api/insights/[...path]` (ADR 0002's identical pattern applied to a second upstream). `MOCK_MODE=1` serves committed JSON fixtures so CI and demos never depend on the analytics service being able to reach a possibly-hibernating BTP trial.

## Consequences
- KPI formulas live and are tested in one place (`analytics/app/kpi.py`, spec §6), with exact expected values asserted against fixtures — not scattered across frontend components.
- Demonstrates a second, independent SAP-adjacent competency (Python integration service) alongside the RAP/OData work — spec §1's "what this demonstrates" recruiter framing.
- Cost: a second deployable service to operate (Render free tier, cold starts) — accepted; mitigated by the 5-minute cache and `MOCK_MODE` fixture fallback.
