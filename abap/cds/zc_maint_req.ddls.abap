@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Maintenance Request'
@Metadata.allowExtensions: true
@Search.searchable: true
define root view entity ZC_Maint_Req
  provider contract transactional_query
  as projection on ZI_Maint_Req
{
  key ReqId,
      EquipId,
      @Search.defaultSearchElement: true
      Title,
      Description,
      Severity,
      Status,
      ReportedBy,
      RejectNote,
      CreatedAt,
      ChangedAt,

      _Equipment : redirected to parent ZC_Equipment,
      _WorkOrder : redirected to ZC_Work_Order
}
