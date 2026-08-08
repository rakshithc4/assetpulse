@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Work Order'
@Metadata.allowExtensions: true
define root view entity ZC_Work_Order
  provider contract transactional_query
  as projection on ZI_Work_Order
{
  key OrderId,
      ReqId,
      EquipId,
      Priority,
      Status,
      AssignedTo,
      ScheduledDate,
      StartedAt,
      CompletedAt,
      DowntimeHours,
      CompletionNotes,
      CancelNote,
      CreatedAt,
      ChangedAt,

      _Request   : redirected to ZC_Maint_Req,
      _Equipment : redirected to parent ZC_Equipment
}
