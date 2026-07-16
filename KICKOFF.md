# KICKOFF — AssetPulse

How to take these documents from zero to shipped. Keep this file in the repo root until v1.0.0, then move to docs/.

## 1. One-time setup (you, ~10 minutes)
1. Create an empty GitHub repo `assetpulse` (public — recruiters must be able to see it).
2. Copy in: `CLAUDE.md`, `DESIGN_BRIEF.md`, `KICKOFF.md`, and the spec at `docs/superpowers/specs/2026-07-16-assetpulse-design.md`. Commit and push.
3. Open the repo in Claude Code.

## 2. The kickoff prompt (paste into Claude Code)
> Read CLAUDE.md and docs/superpowers/specs/2026-07-16-assetpulse-design.md. Then follow CLAUDE.md's "First act" exactly: create the worktree, invoke superpowers:writing-plans to produce the full implementation plan from the spec, and offer me the execution choice.

Pick **Subagent-Driven** when offered (fresh subagent per task + review between tasks — best quality for a flagship project).

## 3. Execution order and your manual gates
The plan Claude Code writes will be granular, but it must respect this phase order and these 🧑 gates (they're in the spec's milestones):

| Phase | Claude Code does | 🧑 You do (Eclipse ADT / BTP / accounts) |
|---|---|---|
| 0 Repo | Scaffold layout, CI skeleton | — |
| 1 ABAP | Author all objects in `abap/` + ABAP Unit tests | Create package ZASSET_MAINT, link abapGit, pull, activate per MANIFEST order, run ATC + ABAP Unit, paste results |
| 2 API | Smoke script | Publish binding ZUI_ASSETPULSE_O4, create comm scenario/user, paste service URL, start trial system |
| 3 Design | Token bridge to Tailwind | Run your Claude Design skill on DESIGN_BRIEF.md, approve outputs into design/ |
| 4 Web | Full frontend, TDD, mock-mode gates | Review at phase gate |
| 5 Analytics | FastAPI service + pytest | Create free Render account, set env vars, deploy |
| 6 Ship | Live E2E, seed script, docs, README, case study | Create Vercel project + env vars; record 90-sec demo |

## 4. Rules of engagement (protect the quality bar)
- Never let a phase close with red gates: ABAP Unit + ATC (SAP), pnpm lint/typecheck/test/e2e (web), pytest (analytics), CI green.
- If the BTP trial resets mid-project: abapGit pull + docs/REDEPLOY.md. Budget one hour, don't panic.
- Scope requests that aren't in the spec go to docs/V2_BACKLOG.md — v1 ships as specified.

## 5. Definition of shipped (v1.0.0)
Live Vercel URL demoing the full lifecycle on real SAP data (fault → convert → schedule → start → complete, with the equipment status flip visible), analytics Insights live, public repo with visible ABAP via abapGit, CI badge green, README + case study + demo video, and two quantified resume bullets committed in docs/.
