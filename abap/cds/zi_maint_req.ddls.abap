@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Maintenance Request'
@Metadata.allowExtensions: true
@ObjectModel.usageType:{ serviceQuality: #X, sizeCategory: #S, dataClass: #MIXED }
define root view entity ZI_Maint_Req
  as select from zmaint_req
{
  key req_id      as ReqId,
      equip_id    as EquipId,
      title       as Title,
      description as Description,
      severity    as Severity,
      status      as Status,
      reported_by as ReportedBy,
      reject_note as RejectNote,
      created_at  as CreatedAt,
      changed_at  as ChangedAt,

      _Equipment : association [1..1] to ZI_AP_Equipment  on $projection.EquipId = _Equipment.EquipId,
      _WorkOrder : association [0..1] to ZI_Work_Order on $projection.ReqId = _WorkOrder.ReqId
}
