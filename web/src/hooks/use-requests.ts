import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import {
  maintRequestSchema, type MaintenanceRequest, type NewRequestForm, type RejectForm, type ConvertForm,
} from '@/lib/types';

const listSchema = z.object({ value: z.array(maintRequestSchema) });
const ACTION_NS = 'com.sap.gateway.srvd.zassetpulse_srv.v0001';

export function useRequestList(params?: { status?: MaintenanceRequest['Status']; search?: string }) {
  return useQuery({
    queryKey: ['requests', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.status) search.set('$filter', `Status eq '${params.status}'`);
      if (params?.search) search.set('$search', params.search);
      search.set('$orderby', 'ChangedAt desc');
      const data = await apiFetch<unknown>(`/api/sap/MaintenanceRequest?${search}`);
      return listSchema.parse(data).value;
    },
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ['requests', id],
    queryFn: () => apiFetch<unknown>(`/api/sap/MaintenanceRequest('${id}')`).then((d) => maintRequestSchema.parse(d)),
    enabled: !!id,
  });
}

export function useCreateRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: NewRequestForm) =>
      apiFetch<MaintenanceRequest>('/api/sap/MaintenanceRequest', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export function useRejectRequest(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: RejectForm) =>
      apiFetch<MaintenanceRequest>(`/api/sap/MaintenanceRequest('${id}')/${ACTION_NS}.RejectRequest`, {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onMutate: async (form) => {
      await client.cancelQueries({ queryKey: ['requests', id] });
      const previous = client.getQueryData<MaintenanceRequest>(['requests', id]);
      if (previous) client.setQueryData(['requests', id], { ...previous, Status: 'REJECTED', RejectNote: form.Note });
      return { previous };
    },
    onError: (_err, _form, context) => {
      if (context?.previous) client.setQueryData(['requests', id], context.previous);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['requests', id] });
      client.invalidateQueries({ queryKey: ['requests'] });
      client.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useConvertRequest(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: ConvertForm) =>
      apiFetch<MaintenanceRequest>(`/api/sap/MaintenanceRequest('${id}')/${ACTION_NS}.ConvertToWorkOrder`, {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onMutate: async () => {
      await client.cancelQueries({ queryKey: ['requests', id] });
      const previous = client.getQueryData<MaintenanceRequest>(['requests', id]);
      if (previous) client.setQueryData(['requests', id], { ...previous, Status: 'CONVERTED' });
      return { previous };
    },
    onError: (_err, _form, context) => {
      if (context?.previous) client.setQueryData(['requests', id], context.previous);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['requests', id] });
      client.invalidateQueries({ queryKey: ['requests'] });
      client.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
