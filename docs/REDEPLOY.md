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
6. Re-run `WEB_BASE_URL=http://localhost:3000 node web/scripts/seed.mjs` if the reset also wiped data (a package/table reset does; a mere hibernate-and-restart does not).

## Prevention
None available on trial tier — this is the accepted tradeoff for a free BTP ABAP Environment. Budget recovery time before demos.
