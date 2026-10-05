import type { MaintenanceRequest, Role, WorkOrder } from './types';

export type RequestAction = 'convert_request' | 'reject_request';
export type OrderAction = 'schedule_order' | 'start_work' | 'complete_work' | 'cancel_order';

interface RequestContext {
  status: MaintenanceRequest['Status'];
}

interface OrderContext {
  status: WorkOrder['Status'];
  assignedTo: string | null;
}

export function canReportRequest(role: Role): boolean {
  return role === 'engineer' || role === 'supervisor';
}

export function canActOnRequest(role: Role, action: RequestAction, ctx: RequestContext): boolean {
  if (role !== 'supervisor') return false;
  return ctx.status === 'REPORTED';
}

function orderStatusAllows(action: OrderAction, status: WorkOrder['Status']): boolean {
  switch (action) {
    case 'schedule_order':
      return status === 'CREATED';
    case 'start_work':
      return status === 'SCHEDULED';
    case 'complete_work':
      return status === 'IN_PROGRESS';
    case 'cancel_order':
      return status === 'CREATED' || status === 'SCHEDULED';
  }
}

export function canActOnOrder(role: Role, action: OrderAction, ctx: OrderContext, currentUser: string): boolean {
  if (!orderStatusAllows(action, ctx.status)) return false;
  if (role === 'supervisor') return true;
  if (role === 'technician') {
    if (action === 'schedule_order' || action === 'cancel_order') return false;
    return ctx.assignedTo === currentUser;
  }
  return false;
}
