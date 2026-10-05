import { describe, it, expect, beforeEach } from 'vitest';
import { resetFixtures } from './fixtures';

beforeEach(() => resetFixtures());

describe('mock handlers', () => {
  it('lists equipment', async () => {
    const res = await fetch('/api/sap/Equipment');
    const body = await res.json();
    expect(body.value).toHaveLength(4);
  });

  it('converts a request and creates a work order', async () => {
    const res = await fetch(`/api/sap/MaintenanceRequest('2')/com.sap.gateway.srvd.zassetpulse_srv.v0001.ConvertToWorkOrder`, {
      method: 'POST',
      body: JSON.stringify({ Priority: '' }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.Status).toBe('CONVERTED');

    const orders = await (await fetch('/api/sap/WorkOrder')).json();
    expect(orders.value.length).toBeGreaterThan(1);
  });

  it('rejects RejectRequest without a note', async () => {
    const res = await fetch(`/api/sap/MaintenanceRequest('1')/com.sap.gateway.srvd.zassetpulse_srv.v0001.RejectRequest`, {
      method: 'POST',
      body: JSON.stringify({ Note: '' }),
    });
    expect(res.status).toBe(400);
  });
});
