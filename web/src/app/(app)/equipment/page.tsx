'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useEquipmentList } from '@/hooks/use-equipment';
import { OpStatusBadge } from '@/components/badges';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';
import { Input } from '@/components/ui/input';
import type { Equipment } from '@/lib/types';

const OP_STATUS_OPTIONS: Array<Equipment['OpStatus'] | 'ALL'> = ['ALL', 'OPERATIONAL', 'MAINTENANCE', 'DOWN'];

export default function EquipmentListPage() {
  const [search, setSearch] = useState('');
  const [opStatus, setOpStatus] = useState<Equipment['OpStatus'] | 'ALL'>('ALL');
  const query = useEquipmentList({ search: search || undefined, opStatus: opStatus === 'ALL' ? undefined : opStatus });
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Search tag or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select
          value={opStatus}
          onChange={(e) => setOpStatus(e.target.value as Equipment['OpStatus'] | 'ALL')}
          className="rounded-md border border-surface-raised bg-surface-panel px-2 py-1 text-sm text-content-primary"
        >
          {OP_STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt === 'ALL' ? 'All statuses' : opt}</option>
          ))}
        </select>
      </div>

      {query.isLoading && <Skeleton className="h-64" />}
      {query.isError && <ErrorState message="Could not load equipment" onRetry={() => query.refetch()} />}
      {query.data?.length === 0 && <EmptyState title="No equipment found" description="Try a different search or filter." />}
      {query.data && query.data.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-raised text-content-secondary">
              <th className="py-2 font-medium">Tag</th>
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Type</th>
              <th className="py-2 font-medium">Site</th>
              <th className="py-2 font-medium">Criticality</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((equip, i) => (
              <motion.tr
                key={equip.EquipId}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: reduceMotion ? 0 : Math.min(i, 12) * 0.03 }}
                className="border-b border-surface-raised/50 hover:bg-surface-panel"
              >
                <td className="py-2">
                  <Link href={`/equipment/${equip.EquipId}`} className="font-mono text-content-primary">{equip.EquipTag}</Link>
                </td>
                <td className="py-2 text-content-secondary">{equip.Name}</td>
                <td className="py-2 text-content-secondary">{equip.EquipType}</td>
                <td className="py-2 text-content-secondary">{equip.Site}</td>
                <td className="py-2 text-content-secondary">{equip.Criticality}</td>
                <td className="py-2"><OpStatusBadge status={equip.OpStatus} /></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
