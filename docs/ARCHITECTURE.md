# AssetPulse architecture

![AssetPulse architecture](./assetpulse-architecture.png)

The hosted demo runs on sample data. Solid arrows are active in the demo; dashed arrows are the live-SAP path (enabled when pointed at an ABAP system with a communication arrangement).

```mermaid
flowchart LR
  U[Browser<br/>Technician · Planner · Manager] --> W[Next.js on Vercel<br/>NextAuth · MSW mock layer]
  W -->|/api/insights| A[FastAPI on Render<br/>KPI analytics]
  W -.->|/api/sap · OData V4| B
  A -.->|live-SAP mode| B
  subgraph SAP[SAP BTP ABAP Environment]
    B[Service binding ZUI_ASSETPULSE_O4] --> D[Service definition ZASSETPULSE_SRV]
    D --> C[CDS projections ZC_* with @UI]
    C --> R[RAP managed BOs<br/>Equipment · Maint. Request · Work Order]
    R --> H[(HANA tables)]
  end
```

## Engineering
- **abapGit → GitHub:** ABAP sources live under `abap/` in the same repo as `web/` and `analytics/`.
- **CI (GitHub Actions):** lint, typecheck, unit tests, Playwright e2e for the web app; ruff and pytest for analytics.
- **Quality gates on SAP:** ABAP Unit 12/12 passing, ATC 0 errors.
