# AssetPulse — 3-Minute Demo Script

**Setup:** the hosted demo (https://assetpulse-psi.vercel.app). It runs on built-in sample data, so there is nothing to seed; say that up front. (`web/scripts/seed.mjs` is only for a SAP-connected deployment.)

**0:00–0:20 — Control room**
Land on `/`. Point out the KPI strip (MTTR, availability %, open orders, 30-day downtime — big mono numerals, tabular figures), the equipment status board grouped by site, and the critical alerts panel showing any CRITICAL fault reports.

**0:20–0:50 — Report a fault**
Click an OPERATIONAL equipment tag → equipment detail → "Report fault". Fill in a HIGH-severity fault, submit. Note: severity CRITICAL would have downed the equipment immediately, before anyone even looks at it — in the ABAP backend that is a determination running server-side (`zbp_i_maint_req`, covered by the ABAP Unit test `crit_request_downs_equip`); the hosted demo mirrors the same status flips in its mock layer.

**0:50–1:30 — Convert and schedule**
Open the new request → "Convert to work order" (priority defaults from severity, editable). Jump to the new work order → "Schedule" with today's date and a technician.

**1:30–2:10 — Start and complete (the differentiator)**
"Start work" — flip back to the equipment detail page and show `OpStatus` is now MAINTENANCE, no manual sync. Return to the order, "Complete" with downtime hours and notes — flip back to equipment again and show it's OPERATIONAL, downtime recorded on the order.

**2:10–2:40 — Insights**
Open `/insights`. Point out the downtime-by-site/type charts, backlog aging buckets, and request frequency by equipment type — the KPIs the separate FastAPI analytics service computes (MTTR, availability, downtime aggregation, backlog aging). In the hosted demo the charts show built-in sample data.

**2:40–3:00 — Wrap**
"Three RAP business objects, six actions, two cross-BO effects, 12 ABAP Unit tests, all abapGit-serialized and visible in the repo. The hosted UI runs on sample data; the backend was built and tested separately on SAP BTP."
