# ABAP Creation/Activation Order — package ZASSET_MAINT

Follow this order exactly when materializing objects in Eclipse ADT (Task 1.10 checkpoint).
Each `[ ]` becomes `[x]` as you activate it; paste the ADT activation log for each group.

## Group 1 — DDIC tables (New > Other ABAP Repository Object > Database Table, ABAP Cloud "source-based" editor)
- [ ] ZEQUIPMENT   (abap/ddic/zequipment.tabl.abap)
- [ ] ZMAINT_REQ   (abap/ddic/zmaint_req.tabl.abap)
- [ ] ZWORK_ORDER  (abap/ddic/zwork_order.tabl.abap)

## Group 2 — Abstract entities (action parameters)
- [ ] ZA_REJECT, ZA_SCHEDULE, ZA_COMPLETE, ZA_CANCEL, ZA_CONVERT (abap/cds/za_*.ddls.abap)

## Group 3 — CDS interface views (root view entities)
- [ ] ZI_AP_EQUIPMENT  (abap/cds/zi_ap_equipment.ddls.abap) — renamed from ZI_EQUIPMENT: that name collided with another user's object in the shared BTP trial namespace
- [ ] ZI_MAINT_REQ  (abap/cds/zi_maint_req.ddls.abap)
- [ ] ZI_WORK_ORDER (abap/cds/zi_work_order.ddls.abap)

## Group 4 — Behavior definitions (interface layer)
- [ ] ZI_AP_EQUIPMENT.bdef   (abap/behavior/zi_ap_equipment.bdef.abap)
- [ ] ZI_MAINT_REQ.bdef   (abap/behavior/zi_maint_req.bdef.abap)
- [ ] ZI_WORK_ORDER.bdef  (abap/behavior/zi_work_order.bdef.abap)

## Group 5 — Behavior implementation classes (create as "Behavior Implementation" from each bdef in ADT — this generates the LHC class stub linked to the bdef; then paste in the body from the file listed)
- [ ] ZBP_I_EQUIPMENT   (abap/behavior/zbp_i_equipment.clas.abap)
- [ ] ZBP_I_MAINT_REQ   (abap/behavior/zbp_i_maint_req.clas.abap)
- [ ] ZBP_I_WORK_ORDER  (abap/behavior/zbp_i_work_order.clas.abap)

## Group 6 — Projections + metadata extensions
- [ ] ZC_EQUIPMENT  (abap/cds/zc_equipment.ddls.abap) + ZC_EQUIPMENT metadata extension (abap/cds/zc_equipment.mdext.abap)
- [ ] ZC_MAINT_REQ  (abap/cds/zc_maint_req.ddls.abap) + metadata extension (abap/cds/zc_maint_req.mdext.abap)
- [ ] ZC_WORK_ORDER (abap/cds/zc_work_order.ddls.abap) + metadata extension (abap/cds/zc_work_order.mdext.abap)
- [ ] Behavior definitions for the projections (abap/behavior/zc_equipment.bdef.abap, zc_maint_req.bdef.abap, zc_work_order.bdef.abap) — projection bdefs just `use` the interface actions/determinations, no new implementation class.

## Group 7 — Service
- [ ] Service definition ZASSETPULSE_SRV (abap/service/zassetpulse_srv.srvd.abap)
- [ ] Service binding ZUI_ASSETPULSE_O4 (OData V4 – UI) — created in ADT (binding has no plain-text source; document the binding name + version here once published)

## Group 8 — Tests
- [ ] ZTC_ASSETPULSE (abap/test/ztc_assetpulse.clas.abap) — run via ABAP Unit, must be all green before Task 1.10 is marked complete.

## Post-activation
- [ ] ATC run on package ZASSET_MAINT — 0 errors, 0 warnings (or documented+justified exceptions)
- [ ] abapGit repo linked to package ZASSET_MAINT, `abap/` pushed (Task 1.11)
- [ ] Communication scenario ZCS_ASSETPULSE + comm user created (Task 2.1)
