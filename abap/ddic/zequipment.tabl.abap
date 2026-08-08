@EndUserText.label : 'AssetPulse — Equipment master'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zequipment {
  key client       : abap.clnt not null;
  key equip_id     : sysuuid_x16 not null;
  equip_tag        : abap.char(20) not null;
  name             : abap.char(100) not null;
  equip_type       : abap.char(20) not null;
  site             : abap.char(40) not null;
  criticality      : abap.char(10) not null;
  op_status        : abap.char(15) not null;
  installed_on     : abap.dats;
  created_at        : timestampl;
  changed_at        : timestampl;
}
