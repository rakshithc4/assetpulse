import { http, HttpResponse } from 'msw';
import { equipment, maintRequests, workOrders } from './fixtures';
import type { MaintenanceRequest, WorkOrder } from '@/lib/types';

const ACTION_NS = 'com.sap.gateway.srvd.zassetpulse_srv.v0001';

function parseKey(pathname: string, entity: string): string | null {
  const match = pathname.match(new RegExp(`/api/sap/${entity}\\('([^']+)'\\)`));
  return match ? match[1] : null;
}

function applyListParams<T extends Record<string, unknown>>(list: T[], url: URL) {
  let result = [...list];
  const filter = url.searchParams.get('$filter');
  if (filter) {
    const match = filter.match(/(\w+) eq '([^']+)'/);
    if (match) {
      const [, field, value] = match;
      result = result.filter((item) => item[field] === value);
    }
  }
  const search = url.searchParams.get('$search');
  if (search) {
    result = result.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()));
  }
  if (url.searchParams.get('$orderby') === 'ChangedAt desc') {
    result = [...result].sort((a, b) => String(b.ChangedAt).localeCompare(String(a.ChangedAt)));
  }
  return { value: result, count: result.length };
}

export const handlers = [
  http.get('/api/sap/Equipment*', ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'Equipment');
    if (key) {
      const found = equipment.find((e) => e.EquipId === key);
      return found ? HttpResponse.json(found) : new HttpResponse(null, { status: 404 });
    }
    const { value, count } = applyListParams(equipment, url);
    return HttpResponse.json({ value, '@odata.count': count });
  }),

  http.get('/api/sap/MaintenanceRequest*', ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'MaintenanceRequest');
    if (key) {
      const found = maintRequests.find((r) => r.ReqId === key);
      return found ? HttpResponse.json(found) : new HttpResponse(null, { status: 404 });
    }
    const { value, count } = applyListParams(maintRequests, url);
    return HttpResponse.json({ value, '@odata.count': count });
  }),

  http.post('/api/sap/MaintenanceRequest', async ({ request }) => {
    const body = (await request.json()) as Partial<MaintenanceRequest>;
    const now = new Date().toISOString();
    const created: MaintenanceRequest = {
      ReqId: String(maintRequests.length + 1),
      EquipId: body.EquipId ?? '',
      Title: body.Title ?? '',
      Description: body.Description ?? null,
      Severity: body.Severity ?? 'MEDIUM',
      Status: 'REPORTED',
      ReportedBy: body.ReportedBy ?? '',
      RejectNote: null,
      CreatedAt: now,
      ChangedAt: now,
    };
    maintRequests.push(created);
    if (created.Severity === 'CRITICAL') {
      const equip = equipment.find((e) => e.EquipId === created.EquipId);
      if (equip) equip.OpStatus = 'DOWN';
    }
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post(`/api/sap/MaintenanceRequest*/${ACTION_NS}.RejectRequest`, async ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'MaintenanceRequest');
    const body = (await request.json()) as { Note: string };
    const req = maintRequests.find((r) => r.ReqId === key);
    if (!req) return new HttpResponse(null, { status: 404 });
    if (!body.Note) {
      return HttpResponse.json({ status: 400, code: 'FIELD_EMPTY', message: 'Note must not be empty' }, { status: 400 });
    }
    req.Status = 'REJECTED';
    req.RejectNote = body.Note;
    req.ChangedAt = new Date().toISOString();
    if (req.Severity === 'CRITICAL') {
      const equip = equipment.find((e) => e.EquipId === req.EquipId);
      if (equip) equip.OpStatus = 'OPERATIONAL';
    }
    return HttpResponse.json(req);
  }),

  http.post(`/api/sap/MaintenanceRequest*/${ACTION_NS}.ConvertToWorkOrder`, async ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'MaintenanceRequest');
    const body = (await request.json()) as { Priority?: string };
    const req = maintRequests.find((r) => r.ReqId === key);
    if (!req) return new HttpResponse(null, { status: 404 });
    req.Status = 'CONVERTED';
    req.ChangedAt = new Date().toISOString();
    const now = new Date().toISOString();
    const order: WorkOrder = {
      OrderId: String(workOrders.length + 1),
      ReqId: req.ReqId,
      EquipId: req.EquipId,
      Priority: (body.Priority || req.Severity) as WorkOrder['Priority'],
      Status: 'CREATED',
      AssignedTo: null,
      ScheduledDate: null,
      StartedAt: null,
      CompletedAt: null,
      DowntimeHours: null,
      CompletionNotes: null,
      CancelNote: null,
      CreatedAt: now,
      ChangedAt: now,
    };
    workOrders.push(order);
    return HttpResponse.json(req);
  }),

  http.get('/api/sap/WorkOrder*', ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'WorkOrder');
    if (key) {
      const found = workOrders.find((o) => o.OrderId === key);
      return found ? HttpResponse.json(found) : new HttpResponse(null, { status: 404 });
    }
    const { value, count } = applyListParams(workOrders, url);
    return HttpResponse.json({ value, '@odata.count': count });
  }),

  http.post(`/api/sap/WorkOrder*/${ACTION_NS}.Schedule`, async ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'WorkOrder');
    const body = (await request.json()) as { ScheduledDate: string; AssignedTo: string };
    const order = workOrders.find((o) => o.OrderId === key);
    if (!order) return new HttpResponse(null, { status: 404 });
    const today = new Date().toISOString().slice(0, 10);
    if (body.ScheduledDate < today) {
      return HttpResponse.json({ status: 400, code: 'SCHEDULE_IN_PAST', message: 'Scheduled date must not be in the past' }, { status: 400 });
    }
    order.Status = 'SCHEDULED';
    order.ScheduledDate = body.ScheduledDate;
    order.AssignedTo = body.AssignedTo;
    order.ChangedAt = new Date().toISOString();
    return HttpResponse.json(order);
  }),

  http.post(`/api/sap/WorkOrder*/${ACTION_NS}.StartWork`, ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'WorkOrder');
    const order = workOrders.find((o) => o.OrderId === key);
    if (!order) return new HttpResponse(null, { status: 404 });
    order.Status = 'IN_PROGRESS';
    order.StartedAt = new Date().toISOString();
    order.ChangedAt = order.StartedAt;
    const equip = equipment.find((e) => e.EquipId === order.EquipId);
    if (equip) equip.OpStatus = 'MAINTENANCE';
    return HttpResponse.json(order);
  }),

  http.post(`/api/sap/WorkOrder*/${ACTION_NS}.CompleteWork`, async ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'WorkOrder');
    const body = (await request.json()) as { CompletionNotes?: string; DowntimeHours: number };
    const order = workOrders.find((o) => o.OrderId === key);
    if (!order) return new HttpResponse(null, { status: 404 });
    if (body.DowntimeHours < 0) {
      return HttpResponse.json({ status: 400, code: 'NEGATIVE_DOWNTIME', message: 'Downtime hours must be zero or greater' }, { status: 400 });
    }
    order.Status = 'COMPLETED';
    order.CompletedAt = new Date().toISOString();
    order.ChangedAt = order.CompletedAt;
    order.CompletionNotes = body.CompletionNotes ?? null;
    order.DowntimeHours = body.DowntimeHours;
    const equip = equipment.find((e) => e.EquipId === order.EquipId);
    if (equip) equip.OpStatus = 'OPERATIONAL';
    return HttpResponse.json(order);
  }),

  http.post(`/api/sap/WorkOrder*/${ACTION_NS}.CancelOrder`, async ({ request }) => {
    const url = new URL(request.url);
    const key = parseKey(url.pathname, 'WorkOrder');
    const body = (await request.json()) as { Note: string };
    const order = workOrders.find((o) => o.OrderId === key);
    if (!order) return new HttpResponse(null, { status: 404 });
    if (!body.Note) {
      return HttpResponse.json({ status: 400, code: 'FIELD_EMPTY', message: 'Note must not be empty' }, { status: 400 });
    }
    order.Status = 'CANCELLED';
    order.CancelNote = body.Note;
    order.ChangedAt = new Date().toISOString();
    return HttpResponse.json(order);
  }),

  http.get('/api/insights/kpi/summary', () =>
    HttpResponse.json({
      mttr_hours: 6.4,
      open_requests_by_severity: { LOW: 1, MEDIUM: 2, HIGH: 1, CRITICAL: 1 },
      open_orders: 3,
      equipment_availability_pct: 83.3,
      total_downtime_hours_30d: 42.5,
    }),
  ),

  http.get('/api/insights/kpi/downtime', ({ request }) => {
    const url = new URL(request.url);
    const by = url.searchParams.get('by') ?? 'site';
    return HttpResponse.json({
      by,
      data:
        by === 'site'
          ? [{ group: 'Pilbara Site A', downtime_hours: 30 }, { group: 'Goldfields Site B', downtime_hours: 12.5 }]
          : [{ group: 'CRUSHER', downtime_hours: 18 }, { group: 'CONVEYOR', downtime_hours: 9 }],
    });
  }),

  http.get('/api/insights/kpi/backlog-aging', () =>
    HttpResponse.json({ buckets: [{ range: '0-7', count: 3 }, { range: '8-30', count: 2 }, { range: '30+', count: 1 }] }),
  ),

  http.get('/api/insights/kpi/frequency', () =>
    HttpResponse.json({
      data: [
        { equip_type: 'CRUSHER', count: 4 },
        { equip_type: 'CONVEYOR', count: 2 },
        { equip_type: 'PUMP', count: 3 },
        { equip_type: 'HAUL_TRUCK', count: 1 },
        { equip_type: 'DRILL', count: 1 },
      ],
    }),
  ),
];
