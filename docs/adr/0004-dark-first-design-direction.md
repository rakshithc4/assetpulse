# ADR 0004: Dark-first design direction, no v1 light theme

## Context
AssetPulse's audience is a recruiter reviewing a portfolio piece and a 2am mine-site control room operator — both contexts favor a dense, high-contrast, low-glare surface over a generic light SaaS dashboard. Spec §8 and DESIGN_BRIEF.md both specify a three-elevation dark surface system with two independent, non-color-only meaning systems (severity, op-status).

## Decision
Ship dark-only for v1. `design/tokens.json` (Task 3.1) defines exactly one surface set; `tailwind.config.ts` (Task 4.1) has no light-mode variant wired up. Light theme is explicitly out of scope (spec §10) and lives in `docs/V2_BACKLOG.md`.

## Consequences
- Every component only needs to satisfy one contrast/AA pass, not two — smaller surface area for the accessibility work that matters (WCAG AA on all severity/status pairings).
- Distinctive visual identity for the portfolio review (spec §1's explicit "visually memorable" requirement) instead of a template-flavored light dashboard.
- Cost: no light-mode option for users who prefer it — accepted per spec §10.
