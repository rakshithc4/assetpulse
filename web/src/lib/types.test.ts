import { describe, it, expect } from 'vitest';
import { equipmentSchema, maintRequestSchema, workOrderSchema } from './types';

describe('domain schemas', () => {
  it('parses a valid equipment record', () => {
    const result = equipmentSchema.safeParse({
      EquipId: '1', EquipTag: 'CRU-104', Name: 'Primary crusher', EquipType: 'CRUSHER',
      Site: 'Pilbara Site A', Criticality: 'HIGH', OpStatus: 'OPERATIONAL',
      InstalledOn: '2020-01-01', CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid EquipType', () => {
    const result = equipmentSchema.safeParse({
      EquipId: '1', EquipTag: 'CRU-104', Name: 'Primary crusher', EquipType: 'SPACESHIP',
      Site: 'Pilbara Site A', Criticality: 'HIGH', OpStatus: 'OPERATIONAL',
      InstalledOn: null, CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('parses a valid maintenance request', () => {
    const result = maintRequestSchema.safeParse({
      ReqId: '1', EquipId: '1', Title: 'Bearing noise', Description: null,
      Severity: 'CRITICAL', Status: 'REPORTED', ReportedBy: 'engineer@demo', RejectNote: null,
      CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('parses a valid work order', () => {
    const result = workOrderSchema.safeParse({
      OrderId: '1', ReqId: '1', EquipId: '1', Priority: 'HIGH', Status: 'CREATED',
      AssignedTo: null, ScheduledDate: null, StartedAt: null, CompletedAt: null,
      DowntimeHours: null, CompletionNotes: null, CancelNote: null,
      CreatedAt: '2026-01-01T00:00:00Z', ChangedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});
