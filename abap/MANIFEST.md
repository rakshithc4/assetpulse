# ABAP sources: package ZASSET_MAINT

This folder is managed by abapGit (FULL folder logic, starting folder `/abap/`,
configured in `.abapgit.xml` at the repo root). Edit objects in ADT, then use
**Stage and Push** in the abapGit Repositories view. Do not hand-edit these files.

## File layout
Each object is serialized as a set of files named `<object>.<type>.<ext>`:
- `*.ddls.asddls`, `*.ddls.baseinfo`, `*.ddls.xml`: CDS view entities and abstract entities
- `*.ddlx.asddlxs`, `*.ddlx.xml`: metadata extensions
- `*.bdef.asbdef`, `*.bdef.xml`: behavior definitions
- `*.clas.abap`, `*.clas.locals_imp.abap`, `*.clas.xml`: classes (behavior pools, exception class, ABAP Unit tests)
- `*.tabl.xml`: database tables
- `*.srvd.srvdsrv`, `*.srvd.xml`: service definition
- `*.srvb.xml`, `*.sco2.xml`: service binding and its OData V4 scope
- `*.msag.xml`, `package.devc.xml`: message class and package

## Objects (all activated)
- [x] Tables: ZEQUIPMENT, ZMAINT_REQ, ZWORK_ORDER
- [x] Abstract entities: ZA_REJECT, ZA_SCHEDULE, ZA_COMPLETE, ZA_CANCEL, ZA_CONVERT
- [x] Interface views and behaviors: ZI_AP_EQUIPMENT (renamed from ZI_EQUIPMENT, which collided with another user's object in the shared BTP trial namespace), ZI_MAINT_REQ, ZI_WORK_ORDER
- [x] Behavior pools: ZBP_I_EQUIPMENT (name kept after the rename), ZBP_I_MAINT_REQ, ZBP_I_WORK_ORDER
- [x] Projections, metadata extensions and projection behaviors: ZC_EQUIPMENT, ZC_MAINT_REQ, ZC_WORK_ORDER
- [x] Service definition ZASSETPULSE_SRV and binding ZUI_ASSETPULSE_O4 (OData V4, UI)
- [x] Tests: ZTC_ASSETPULSE (ABAP Unit 12/12 passing)
- [x] ATC on ZASSET_MAINT: 0 errors
- [x] abapGit repo linked to ZASSET_MAINT and pushed

## Still to do
- [ ] Communication scenario ZCS_ASSETPULSE and communication user (Task 2.1)
