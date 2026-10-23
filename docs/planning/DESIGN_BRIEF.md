# Design brief — AssetPulse (input for Claude Design)

Design the complete UI for AssetPulse, a dark-first asset-maintenance control room for mining operations. Binding product spec: `docs/superpowers/specs/2026-07-16-assetpulse-design.md` §7–§8. Deliverables land in `design/`. This is the owner's flagship portfolio piece — the bar is "visually memorable in a portfolio review", not "clean enough".

## Direction
Operations control room at 2am on a mine site: calm, dense, legible, authoritative. Near-black layered surfaces (background → panel → raised card, three distinct elevations), high-contrast neutral type, and color reserved almost exclusively for *meaning* — status and severity. Monospace accents for machine-adjacent data: equipment tags (CRU-104), UUIDs, timestamps, KPI numerals. Reference the restraint of Linear and the data confidence of a good Grafana board, but with its own identity — avoid the generic dark-dashboard template look (no purple-gradient hero, no glassmorphism).

## Meaning systems (the core of this design)
Two independent coded systems, each readable without color alone (icon or text label always present, AA contrast on dark):
1. **Severity/criticality** (requests + equipment): LOW, MEDIUM, HIGH, CRITICAL — an escalating ramp; CRITICAL must feel urgent at a glance and is the only thing on screen allowed to pulse (subtle, ≤2s cycle, honors reduced-motion).
2. **Operational status** (equipment): OPERATIONAL (steady/positive), MAINTENANCE (active-work amber family), DOWN (unmistakable alarm). These drive the dashboard status board.
Work-order lifecycle (CREATED → SCHEDULED → IN_PROGRESS → COMPLETED, CANCELLED) gets a neutral progression treatment distinct from both systems.

## Screens (7, all states)
1. **Login** — three persona cards (Engineer / Supervisor / Technician) as one-click entries; product mark.
2. **Control room (dashboard)** — KPI strip (MTTR, availability %, open requests, 30-day downtime; big mono numerals with unit + trend), equipment status board (dense grid of tag chips colored by op-status, grouped by site), critical alerts panel, recent activity feed.
3. **Equipment register** — filterable table; criticality and op-status columns using the meaning systems.
4. **Equipment detail** — header card (tag, name, site, criticality, live op-status), merged maintenance history timeline, "Report fault" CTA.
5. **Requests** (list + new-fault form + detail) — severity-forward; detail carries Convert (priority dialog) and Reject (required-note dialog, destructive styling).
6. **Work orders** (list + detail) — technician "My orders" default; detail is the richest screen: lifecycle stepper, role-gated action bar, Schedule dialog (date + technician), Complete dialog (notes + downtime hours), linked request + equipment cards.
7. **Insights** — four chart panels (summary is on dashboard; here: downtime by site/type, backlog aging buckets, frequency by type). Specify chart styling: gridlines, axis type, tooltip, and the severity ramp reused for aging buckets.

Per data view: loading skeleton, empty state (helpful copy + CTA), error state (message + retry). Confirmation dialogs for all irreversible actions.

## Craft details that make it portfolio-grade
- Typographic scale with real hierarchy; tabular numerals for all metrics.
- Focus states designed, not default; keyboard path through dialogs specified.
- Density: tables comfortable at 12+ rows without feeling cramped; 1280px primary, graceful at 768px.
- Motion: 120–200ms ease-out on overlays/toasts only; nothing animates on scroll.

## Deliverables (into design/)
1. `tokens.json` — surfaces (3 elevations), text tiers, both meaning systems (`severity.critical.bg/fg/border`, `opstatus.down.*`, …), lifecycle-neutral set, type scale, spacing, radius, mono font stack. Systematic names — these convert mechanically to Tailwind config.
2. All 7 screens including states and both key dialogs (Reject, Complete).
3. `design/README.md` — rationale + component usage rules (when to use which meaning system, badge anatomy, chart rules).

## Out of scope
Light theme (v2), marketing pages, mobile app, email templates.
