#!/usr/bin/env node
// Seeds realistic demo data through the running app's own /api/sap proxy —
// reuses its CSRF/auth handling instead of re-implementing it here.
// Run: WEB_BASE_URL=http://localhost:3000 node web/scripts/seed.mjs

const WEB_BASE_URL = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
const ACTION_NS = 'com.sap.gateway.srvd.zassetpulse_srv.v0001';
const SITES = ['Pilbara Site A', 'Goldfields Site B'];

const EQUIPMENT = [
  { EquipTag: 'CRU-104', Name: 'Primary crusher — Line 1', EquipType: 'CRUSHER', Site: SITES[0], Criticality: 'CRITICAL' },
  { EquipTag: 'CRU-105', Name: 'Secondary crusher — Line 1', EquipType: 'CRUSHER', Site: SITES[0], Criticality: 'HIGH' },
  { EquipTag: 'CNV-22', Name: 'Overland conveyor', EquipType: 'CONVEYOR', Site: SITES[0], Criticality: 'HIGH' },
  { EquipTag: 'CNV-23', Name: 'Stacker conveyor', EquipType: 'CONVEYOR', Site: SITES[0], Criticality: 'MEDIUM' },
  { EquipTag: 'PMP-08', Name: 'Slurry pump', EquipType: 'PUMP', Site: SITES[1], Criticality: 'MEDIUM' },
  { EquipTag: 'PMP-09', Name: 'Process water pump', EquipType: 'PUMP', Site: SITES[1], Criticality: 'LOW' },
  { EquipTag: 'HTR-15', Name: 'Haul truck 15', EquipType: 'HAUL_TRUCK', Site: SITES[1], Criticality: 'HIGH' },
  { EquipTag: 'HTR-16', Name: 'Haul truck 16', EquipType: 'HAUL_TRUCK', Site: SITES[1], Criticality: 'HIGH' },
  { EquipTag: 'HTR-17', Name: 'Haul truck 17', EquipType: 'HAUL_TRUCK', Site: SITES[0], Criticality: 'MEDIUM' },
  { EquipTag: 'DRL-03', Name: 'Rotary drill rig', EquipType: 'DRILL', Site: SITES[1], Criticality: 'HIGH' },
  { EquipTag: 'DRL-04', Name: 'Blast hole drill', EquipType: 'DRILL', Site: SITES[1], Criticality: 'MEDIUM' },
  { EquipTag: 'CNV-24', Name: 'Transfer conveyor', EquipType: 'CONVEYOR', Site: SITES[1], Criticality: 'LOW' },
];

const REQUEST_TEMPLATES = [
  { title: 'Bearing noise', severity: 'HIGH' },
  { title: 'Belt tracking off-center', severity: 'MEDIUM' },
  { title: 'Seal leak', severity: 'CRITICAL' },
  { title: 'Hydraulic pressure low', severity: 'HIGH' },
  { title: 'Tyre wear excessive', severity: 'MEDIUM' },
  { title: 'Vibration on startup', severity: 'LOW' },
  { title: 'Coolant temperature high', severity: 'HIGH' },
  { title: 'Loose guarding', severity: 'LOW' },
  { title: 'Drill bit chatter', severity: 'MEDIUM' },
  { title: 'Motor overheating', severity: 'CRITICAL' },
];

async function post(path, body) {
  const res = await fetch(`${WEB_BASE_URL}/api/sap/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function get(path) {
  const res = await fetch(`${WEB_BASE_URL}/api/sap/${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

function isoDate(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);
}

async function main() {
  console.log(`Seeding against ${WEB_BASE_URL} ...`);

  const equipment = [];
  for (const e of EQUIPMENT) {
    const created = await post('Equipment', { ...e, InstalledOn: '2020-01-01' });
    equipment.push(created);
    console.log(`  equipment: ${created.EquipTag}`);
  }

  const requests = [];
  for (let i = 0; i < REQUEST_TEMPLATES.length; i++) {
    const equip = equipment[i % equipment.length];
    const t = REQUEST_TEMPLATES[i];
    const created = await post('MaintenanceRequest', {
      EquipId: equip.EquipId,
      Title: t.title,
      Severity: t.severity,
      ReportedBy: 'engineer@demo',
    });
    requests.push(created);
    console.log(`  request: ${created.Title}`);
  }

  // Convert 8 of the 10 requests into work orders; the remaining 2 stay REPORTED
  // so the dashboard's critical-alerts panel and requests list have open items too.
  const orders = [];
  for (let i = 0; i < 8; i++) {
    const req = requests[i];
    await post(`MaintenanceRequest('${req.ReqId}')/${ACTION_NS}.ConvertToWorkOrder`, { Priority: '' });
    const withOrder = await get(`MaintenanceRequest('${req.ReqId}')?$expand=_WorkOrder`);
    orders.push(withOrder._WorkOrder[0]);
    console.log(`  converted: ${req.Title}`);
  }

  // Spread the 8 orders across every lifecycle stage: 2 CREATED, 2 SCHEDULED, 2 IN_PROGRESS, 1 COMPLETED, 1 CANCELLED
  await post(`WorkOrder('${orders[2].OrderId}')/${ACTION_NS}.Schedule`, { ScheduledDate: isoDate(2), AssignedTo: 'tech@demo' });
  await post(`WorkOrder('${orders[3].OrderId}')/${ACTION_NS}.Schedule`, { ScheduledDate: isoDate(3), AssignedTo: 'tech@demo' });

  await post(`WorkOrder('${orders[4].OrderId}')/${ACTION_NS}.Schedule`, { ScheduledDate: isoDate(0), AssignedTo: 'tech@demo' });
  await post(`WorkOrder('${orders[4].OrderId}')/${ACTION_NS}.StartWork`, {});

  await post(`WorkOrder('${orders[5].OrderId}')/${ACTION_NS}.Schedule`, { ScheduledDate: isoDate(0), AssignedTo: 'tech@demo' });
  await post(`WorkOrder('${orders[5].OrderId}')/${ACTION_NS}.StartWork`, {});

  await post(`WorkOrder('${orders[6].OrderId}')/${ACTION_NS}.Schedule`, { ScheduledDate: isoDate(0), AssignedTo: 'tech@demo' });
  await post(`WorkOrder('${orders[6].OrderId}')/${ACTION_NS}.StartWork`, {});
  await post(`WorkOrder('${orders[6].OrderId}')/${ACTION_NS}.CompleteWork`, { CompletionNotes: 'Replaced worn component', DowntimeHours: 3.5 });

  await post(`WorkOrder('${orders[7].OrderId}')/${ACTION_NS}.CancelOrder`, { Note: 'Duplicate of another work order' });

  console.log('\nSeed complete: 12 equipment, 10 requests, 8 work orders across every lifecycle stage.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
