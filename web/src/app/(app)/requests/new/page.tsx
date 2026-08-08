'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEquipmentList } from '@/hooks/use-equipment';
import { useCreateRequest } from '@/hooks/use-requests';
import { newRequestFormSchema, severityEnum } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function NewRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const equipmentQuery = useEquipmentList();
  const createRequest = useCreateRequest();

  const [form, setForm] = useState({
    EquipId: searchParams.get('equipId') ?? '',
    Title: '',
    Description: '',
    Severity: 'MEDIUM' as (typeof severityEnum.options)[number],
    ReportedBy: 'engineer@demo',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = newRequestFormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    createRequest.mutate(result.data, { onSuccess: () => router.push('/requests') });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-medium text-content-primary">Report a fault</h1>

      <div>
        <label className="text-sm text-content-secondary" htmlFor="equip">Equipment</label>
        <select
          id="equip"
          value={form.EquipId}
          onChange={(e) => setForm({ ...form, EquipId: e.target.value })}
          className="mt-1 w-full rounded-md border border-surface-raised bg-surface-panel px-2 py-2 text-sm text-content-primary"
        >
          <option value="">Select equipment…</option>
          {equipmentQuery.data?.map((equip) => (
            <option key={equip.EquipId} value={equip.EquipId}>{equip.EquipTag} — {equip.Name}</option>
          ))}
        </select>
        {errors.EquipId && <p className="mt-1 text-xs text-severity-high-fg">{errors.EquipId}</p>}
      </div>

      <div>
        <label className="text-sm text-content-secondary" htmlFor="title">Title</label>
        <Input id="title" value={form.Title} onChange={(e) => setForm({ ...form, Title: e.target.value })} />
        {errors.Title && <p className="mt-1 text-xs text-severity-high-fg">{errors.Title}</p>}
      </div>

      <div>
        <label className="text-sm text-content-secondary" htmlFor="description">Description</label>
        <Textarea id="description" value={form.Description} onChange={(e) => setForm({ ...form, Description: e.target.value })} />
      </div>

      <div>
        <label className="text-sm text-content-secondary" htmlFor="severity">Severity</label>
        <select
          id="severity"
          value={form.Severity}
          onChange={(e) => setForm({ ...form, Severity: e.target.value as typeof form.Severity })}
          className="mt-1 w-full rounded-md border border-surface-raised bg-surface-panel px-2 py-2 text-sm text-content-primary"
        >
          {severityEnum.options.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Button type="submit" disabled={createRequest.isPending}>{createRequest.isPending ? 'Submitting…' : 'Submit request'}</Button>
      {createRequest.isError && <p className="text-sm text-severity-high-fg">{createRequest.error.message}</p>}
    </form>
  );
}
