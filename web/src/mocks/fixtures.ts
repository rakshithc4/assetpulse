import type { Equipment, MaintenanceRequest, WorkOrder } from '@/lib/types';

export const equipment: Equipment[] = [
  { EquipId: '1', EquipTag: 'CRU-104', Name: 'Primary crusher — Line 1', EquipType: 'CRUSHER', Site: 'Pilbara Site A', Criticality: 'CRITICAL', OpStatus: 'OPERATIONAL', InstalledOn: '2019-03-01', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
  { EquipId: '2', EquipTag: 'CNV-22', Name: 'Overland conveyor', EquipType: 'CONVEYOR', Site: 'Pilbara Site A', Criticality: 'HIGH', OpStatus: 'MAINTENANCE', InstalledOn: '2020-06-15', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
  { EquipId: '3', EquipTag: 'PMP-08', Name: 'Slurry pump', EquipType: 'PUMP', Site: 'Goldfields Site B', Criticality: 'MEDIUM', OpStatus: 'DOWN', InstalledOn: '2018-11-20', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
  { EquipId: '4', EquipTag: 'HTR-15', Name: 'Haul truck 15', EquipType: 'HAUL_TRUCK', Site: 'Goldfields Site B', Criticality: 'HIGH', OpStatus: 'OPERATIONAL', InstalledOn: '2021-02-10', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
];

export const maintRequests: MaintenanceRequest[] = [
  { ReqId: '1', EquipId: '3', Title: 'Pump seal leaking', Description: 'Visible slurry leak at seal housing', Severity: 'CRITICAL', Status: 'REPORTED', ReportedBy: 'engineer@demo', RejectNote: null, CreatedAt: '2026-07-10T02:00:00Z', ChangedAt: '2026-07-10T02:00:00Z' },
  { ReqId: '2', EquipId: '2', Title: 'Belt tracking off-center', Description: null, Severity: 'HIGH', Status: 'CONVERTED', ReportedBy: 'engineer@demo', RejectNote: null, CreatedAt: '2026-07-08T02:00:00Z', ChangedAt: '2026-07-09T02:00:00Z' },
];

export const workOrders: WorkOrder[] = [
  { OrderId: '1', ReqId: '2', EquipId: '2', Priority: 'HIGH', Status: 'IN_PROGRESS', AssignedTo: 'tech@demo', ScheduledDate: '2026-07-10', StartedAt: '2026-07-10T22:00:00Z', CompletedAt: null, DowntimeHours: null, CompletionNotes: null, CancelNote: null, CreatedAt: '2026-07-09T02:00:00Z', ChangedAt: '2026-07-10T22:00:00Z' },
];

export function resetFixtures() {
  equipment.length = 0;
  equipment.push(
    { EquipId: '1', EquipTag: 'CRU-104', Name: 'Primary crusher — Line 1', EquipType: 'CRUSHER', Site: 'Pilbara Site A', Criticality: 'CRITICAL', OpStatus: 'OPERATIONAL', InstalledOn: '2019-03-01', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
    { EquipId: '2', EquipTag: 'CNV-22', Name: 'Overland conveyor', EquipType: 'CONVEYOR', Site: 'Pilbara Site A', Criticality: 'HIGH', OpStatus: 'MAINTENANCE', InstalledOn: '2020-06-15', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
    { EquipId: '3', EquipTag: 'PMP-08', Name: 'Slurry pump', EquipType: 'PUMP', Site: 'Goldfields Site B', Criticality: 'MEDIUM', OpStatus: 'DOWN', InstalledOn: '2018-11-20', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
    { EquipId: '4', EquipTag: 'HTR-15', Name: 'Haul truck 15', EquipType: 'HAUL_TRUCK', Site: 'Goldfields Site B', Criticality: 'HIGH', OpStatus: 'OPERATIONAL', InstalledOn: '2021-02-10', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z' },
  );
  maintRequests.length = 0;
  maintRequests.push(
    { ReqId: '1', EquipId: '3', Title: 'Pump seal leaking', Description: 'Visible slurry leak at seal housing', Severity: 'CRITICAL', Status: 'REPORTED', ReportedBy: 'engineer@demo', RejectNote: null, CreatedAt: '2026-07-10T02:00:00Z', ChangedAt: '2026-07-10T02:00:00Z' },
    { ReqId: '2', EquipId: '2', Title: 'Belt tracking off-center', Description: null, Severity: 'HIGH', Status: 'CONVERTED', ReportedBy: 'engineer@demo', RejectNote: null, CreatedAt: '2026-07-08T02:00:00Z', ChangedAt: '2026-07-09T02:00:00Z' },
  );
  workOrders.length = 0;
  workOrders.push(
    { OrderId: '1', ReqId: '2', EquipId: '2', Priority: 'HIGH', Status: 'IN_PROGRESS', AssignedTo: 'tech@demo', ScheduledDate: '2026-07-10', StartedAt: '2026-07-10T22:00:00Z', CompletedAt: null, DowntimeHours: null, CompletionNotes: null, CancelNote: null, CreatedAt: '2026-07-09T02:00:00Z', ChangedAt: '2026-07-10T22:00:00Z' },
  );
}
