// Sample KPI payloads, shaped exactly like the analytics service's responses.
// Two consumers share this file so they can never drift apart:
//   1. the in-browser mock layer (src/mocks/handlers.ts) answering /api/insights/*
//   2. the insights hooks, as the graceful fallback when the analytics service is
//      still waking up (Render's free tier cold-starts in about a minute).
// Plain data only: no msw/react imports, so it is safe to ship in the app bundle.

export const FALLBACK_SUMMARY = {
  mttr_hours: 6.4,
  open_requests_by_severity: { LOW: 1, MEDIUM: 2, HIGH: 1, CRITICAL: 1 },
  open_orders: 3,
  equipment_availability_pct: 83.3,
  total_downtime_hours_30d: 42.5,
};

export function fallbackDowntime(by: string) {
  return {
    by,
    data:
      by === 'site'
        ? [
            { group: 'Pilbara Site A', downtime_hours: 30 },
            { group: 'Goldfields Site B', downtime_hours: 12.5 },
          ]
        : [
            { group: 'CRUSHER', downtime_hours: 18 },
            { group: 'CONVEYOR', downtime_hours: 9 },
          ],
  };
}

export const FALLBACK_BACKLOG = {
  buckets: [
    { range: '0-7', count: 3 },
    { range: '8-30', count: 2 },
    { range: '30+', count: 1 },
  ],
};

export const FALLBACK_FREQUENCY = {
  data: [
    { equip_type: 'CRUSHER', count: 4 },
    { equip_type: 'CONVEYOR', count: 2 },
    { equip_type: 'PUMP', count: 3 },
    { equip_type: 'HAUL_TRUCK', count: 1 },
    { equip_type: 'DRILL', count: 1 },
  ],
};
