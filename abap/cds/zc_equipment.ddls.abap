@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Equipment'
@Metadata.allowExtensions: true
@ObjectModel.semanticKey: [ 'EquipTag' ]
@Search.searchable: true
define root view entity ZC_Equipment
  provider contract transactional_query
  as projection on ZI_Equipment
{
  key EquipId,
      @Search.defaultSearchElement: true
      EquipTag,
      @Search.defaultSearchElement: true
      Name,
      EquipType,
      Site,
      Criticality,
      OpStatus,
      InstalledOn,
      CreatedAt,
      ChangedAt,

      _MaintReq  : redirected to composition child ZC_Maint_Req,
      _WorkOrder : redirected to composition child ZC_Work_Order
}
