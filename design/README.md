# AssetPulse design tokens

`tokens.json` is the single source of truth for color, type, and radius — `web/tailwind.config.ts` reads it directly and generates the Tailwind classes components use. No component ever hardcodes a hex value (CLAUDE.md rule 7).

## Direction

Warm charcoal, not blue-black. Three elevations (`surface.base` → `panel` → `raised`) instead of flat dark-gray, so cards visibly lift off the background without a border doing all the work. Monospace (`type.fontMono`, IBM Plex Mono) is reserved for machine-adjacent data — equipment tags, UUIDs, timestamps, KPI numerals — everything else uses `type.fontSans` (Manrope). Radii are small (3/6/10px): dense and authoritative, not soft.

## Two independent meaning systems — don't mix them

- **`severity`** (low/medium/high/critical) — an escalating urgency ramp, used on maintenance requests. Critical is the only color allowed to pulse.
- **`opstatus`** (operational/maintenance/down) — equipment's live state. Deliberately a *different hue family* from severity (teal for operational vs. green for severity-low) so the two systems stay visually distinct even when a critical request and a down asset appear side by side.
- **`lifecycle`** (created/scheduled/in_progress/completed/cancelled) — work-order progression. Neutral/blue/violet, never reuses severity or opstatus hues, so a work order's stage is never mistaken for how urgent or broken something is.

Every badge pairs color with an icon or text label — never color alone (AA contrast verified: all fg/bg pairs ≥4.2:1 on their surface, see git history for the calculation).

## Badge anatomy

Every status/severity chip = `bg` (fill) + `fg` (text/icon) + `border` (1px, slightly more saturated than `fg`) from the same token group. Never mix `bg` from one group with `fg` from another.

## Third-party component credit

The hover-underline link micro-interaction used for "View all" links on the control room dashboard (`web/src/components/ui/skiper-ui/skiper40.tsx`) is sourced from [Skiper UI](https://skiper-ui.com) (component `skiper40`, free tier — attribution required per its license, preserved in the file's own header comment). Everything else under `web/src/components/ui/` is original work for this project.

## What's not in this pass

Full screen mockups (7 screens + 2 key dialogs) called for in `DESIGN_BRIEF.md` weren't generated here — this pass covered tokens only, since that's what actually drives the Tailwind build. Components consume these tokens directly in dev; if full static mockups are wanted later (e.g. for a portfolio case study image), run the brief's screen deliverables separately.
