import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import {
  workOrderSchema, type WorkOrder, type ScheduleForm, type CompleteForm, type CancelForm,
} from '@/lib/types';

const listSchema = z.object({ value: z.array(workOrderSchema) });
const ACTION_NS = 'com.sap.gateway.srvd.zassetpulse_srv.v0001';

export function useOrderList(params?: { assignedTo?: string }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.assignedTo) search.set('$filter', `assigned_to eq '${params.assignedTo}'`);
      search.set('$orderby', 'ChangedAt desc');
      const data = await apiFetch<unknown>(`/api/sap/WorkOrder?${search}`);
      return listSchema.parse(data).value;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => apiFetch<unknown>(`/api/sap/WorkOrder('${id}')`).then((d) => workOrderSchema.parse(d)),
    enabled: !!id,
  });
}

function useOrderAction<TForm>(id: string, action: string, optimisticPatch: (form: TForm) => Partial<WorkOrder>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: TForm) =>
      apiFetch<WorkOrder>(`/api/sap/WorkOrder('${id}')/${ACTION_NS}.${action}`, { method: 'POST', body: JSON.stringify(form) }),
    onMutate: async (form) => {
      await client.cancelQueries({ queryKey: ['orders', id] });
      const previous = client.getQueryData<WorkOrder>(['orders', id]);
      if (previous) client.setQueryData(['orders', id], { ...previous, ...optimisticPatch(form) });
      return { previous };
    },
    onError: (_err, _form, context) => {
      if (context?.previous) client.setQueryData(['orders', id], context.previous);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['orders', id] });
      client.invalidateQueries({ queryKey: ['orders'] });
      client.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useScheduleOrder(id: string) {
  return useOrderAction<ScheduleForm>(id, 'Schedule', (form) => ({ Status: 'SCHEDULED', ...form }));
}

export function useStartWork(id: string) {
  return useOrderAction<Record<string, never>>(id, 'StartWork', () => ({ Status: 'IN_PROGRESS' }));
}

export function useCompleteWork(id: string) {
  return useOrderAction<CompleteForm>(id, 'CompleteWork', (form) => ({ Status: 'COMPLETED', ...form }));
}

export function useCancelOrder(id: string) {
  return useOrderAction<CancelForm>(id, 'CancelOrder', () => ({ Status: 'CANCELLED' }));
}
