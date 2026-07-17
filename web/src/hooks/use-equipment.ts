import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import { equipmentSchema, type Equipment } from '@/lib/types';

const listSchema = z.object({ value: z.array(equipmentSchema) });

export function useEquipmentList(params?: { opStatus?: Equipment['OpStatus']; search?: string }) {
  return useQuery({
    queryKey: ['equipment', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.opStatus) search.set('$filter', `op_status eq '${params.opStatus}'`);
      if (params?.search) search.set('$search', params.search);
      const data = await apiFetch<unknown>(`/api/sap/Equipment?${search}`);
      return listSchema.parse(data).value;
    },
    refetchInterval: 30_000,
  });
}

export function useEquipment(id: string) {
  return useQuery({
    queryKey: ['equipment', id],
    queryFn: () => apiFetch<unknown>(`/api/sap/Equipment('${id}')`).then((d) => equipmentSchema.parse(d)),
    enabled: !!id,
  });
}
