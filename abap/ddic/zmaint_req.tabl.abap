@EndUserText.label : 'AssetPulse — Maintenance request'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zmaint_req {
  key client       : abap.clnt not null;
  key req_id       : sysuuid_x16 not null;
  equip_id         : sysuuid_x16 not null;
  title            : abap.char(100) not null;
  description      : abap.char(255);
  severity         : abap.char(10) not null;
  status           : abap.char(15) not null;
  reported_by      : abap.char(12) not null;
  reject_note      : abap.char(255);
  created_at        : timestampl;
  changed_at        : timestampl;
}
