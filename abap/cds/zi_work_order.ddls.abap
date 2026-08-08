@AbapCatalog.sqlViewName: 'ZIVWORKORDER'
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Work Order'
@Metadata.allowExtensions: true
@ObjectModel.usageType:{ serviceQuality: #X, sizeCategory: #S, dataClass: #MIXED }
define root view entity ZI_Work_Order
  as select from zwork_order
{
  key order_id         as OrderId,
      req_id           as ReqId,
      equip_id         as EquipId,
      priority         as Priority,
      status           as Status,
      assigned_to      as AssignedTo,
      scheduled_date   as ScheduledDate,
      started_at       as StartedAt,
      completed_at     as CompletedAt,
      downtime_hours   as DowntimeHours,
      completion_notes as CompletionNotes,
      cancel_note      as CancelNote,
      created_at       as CreatedAt,
      changed_at       as ChangedAt,

      _Request   : association [1..1] to ZI_Maint_Req on $projection.ReqId   = _Request.ReqId,
      _Equipment : association [1..1] to ZI_Equipment on $projection.EquipId = _Equipment.EquipId
}
