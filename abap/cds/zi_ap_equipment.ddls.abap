@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Equipment'
@Metadata.allowExtensions: true
@ObjectModel.usageType:{ serviceQuality: #X, sizeCategory: #S, dataClass: #MIXED }
define root view entity ZI_AP_Equipment
  as select from zequipment
{
  key equip_id     as EquipId,
      equip_tag    as EquipTag,
      name         as Name,
      equip_type   as EquipType,
      site         as Site,
      criticality  as Criticality,
      op_status    as OpStatus,
      installed_on as InstalledOn,
      created_at   as CreatedAt,
      changed_at   as ChangedAt,

      _MaintReq  : association [0..*] to ZI_Maint_Req  on $projection.EquipId = _MaintReq.EquipId,
      _WorkOrder : association [0..*] to ZI_Work_Order on $projection.EquipId = _WorkOrder.EquipId
}
