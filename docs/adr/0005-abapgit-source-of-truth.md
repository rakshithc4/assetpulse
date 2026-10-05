# ADR 0005: abapGit as ABAP source-of-truth strategy

## Context
Claude Code cannot reach SAP BTP directly — ABAP only activates inside Eclipse ADT (CLAUDE.md, non-negotiable). Without a serialization strategy, the real ABAP source would live only inside the BTP trial system: invisible to a recruiter reading the GitHub repo, and lost outright on a trial reset.

## Decision
Link the ADT package `ZASSET_MAINT` to this GitHub repo's `abap/` folder via abapGit from day one (Task 1.11), immediately after first activation. Every subsequent ABAP change is authored here first, then materialized in ADT, then pushed back through abapGit.

## Consequences
- The public repo shows real, activated ABAP source (tables, CDS, behavior definitions/implementations, tests) — recruiter-checkable, not a description of what SAP work would look like.
- Trial resets (`docs/REDEPLOY.md`) become a one-command recovery (abapGit pull) instead of re-authoring everything from memory.
- Cost: an extra manual sync step at every ABAP-touching checkpoint — accepted, since the alternative (source only in the trial system) fails the "recruiter-checkable" success criterion in spec §1.
