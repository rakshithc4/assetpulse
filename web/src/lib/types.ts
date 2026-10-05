import { z } from 'zod';

export const equipTypeEnum = z.enum(['CRUSHER', 'CONVEYOR', 'PUMP', 'HAUL_TRUCK', 'DRILL']);
export const criticalityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const opStatusEnum = z.enum(['OPERATIONAL', 'MAINTENANCE', 'DOWN']);
export const severityEnum = criticalityEnum;
export const requestStatusEnum = z.enum(['REPORTED', 'CONVERTED', 'REJECTED']);
export const orderStatusEnum = z.enum(['CREATED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const roleEnum = z.enum(['engineer', 'supervisor', 'technician']);
export type Role = z.infer<typeof roleEnum>;

export const equipmentSchema = z.object({
  EquipId: z.string(),
  EquipTag: z.string(),
  Name: z.string(),
  EquipType: equipTypeEnum,
  Site: z.string(),
  Criticality: criticalityEnum,
  OpStatus: opStatusEnum,
  InstalledOn: z.string().nullable(),
  CreatedAt: z.string(),
  ChangedAt: z.string(),
});
export type Equipment = z.infer<typeof equipmentSchema>;

export const maintRequestSchema = z.object({
  ReqId: z.string(),
  EquipId: z.string(),
  Title: z.string(),
  Description: z.string().nullable(),
  Severity: severityEnum,
  Status: requestStatusEnum,
  ReportedBy: z.string(),
  RejectNote: z.string().nullable(),
  CreatedAt: z.string(),
  ChangedAt: z.string(),
});
export type MaintenanceRequest = z.infer<typeof maintRequestSchema>;

export const workOrderSchema = z.object({
  OrderId: z.string(),
  ReqId: z.string(),
  EquipId: z.string(),
  Priority: criticalityEnum,
  Status: orderStatusEnum,
  AssignedTo: z.string().nullable(),
  ScheduledDate: z.string().nullable(),
  StartedAt: z.string().nullable(),
  CompletedAt: z.string().nullable(),
  DowntimeHours: z.number().nullable(),
  CompletionNotes: z.string().nullable(),
  CancelNote: z.string().nullable(),
  CreatedAt: z.string(),
  ChangedAt: z.string(),
});
export type WorkOrder = z.infer<typeof workOrderSchema>;

export const newRequestFormSchema = z.object({
  EquipId: z.string().min(1, 'Select equipment'),
  Title: z.string().min(1, 'Title is required').max(100),
  Description: z.string().max(255).optional(),
  Severity: severityEnum,
  ReportedBy: z.string().min(1),
});
export type NewRequestForm = z.infer<typeof newRequestFormSchema>;

export const scheduleFormSchema = z.object({
  ScheduledDate: z.string().min(1, 'Date is required'),
  AssignedTo: z.string().min(1, 'Technician is required'),
});
export type ScheduleForm = z.infer<typeof scheduleFormSchema>;

export const completeFormSchema = z.object({
  CompletionNotes: z.string().max(255).optional(),
  DowntimeHours: z.coerce.number().min(0, 'Downtime hours must be zero or greater'),
});
export type CompleteForm = z.infer<typeof completeFormSchema>;

export const rejectFormSchema = z.object({
  Note: z.string().min(1, 'A reason is required').max(255),
});
export type RejectForm = z.infer<typeof rejectFormSchema>;

export const cancelFormSchema = rejectFormSchema;
export type CancelForm = z.infer<typeof cancelFormSchema>;

export const convertFormSchema = z.object({
  Priority: criticalityEnum,
});
export type ConvertForm = z.infer<typeof convertFormSchema>;
