@EndUserText.label : 'AssetPulse — Work order'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zwork_order {
  key client        : abap.clnt not null;
  key order_id      : sysuuid_x16 not null;
  req_id            : sysuuid_x16 not null;
  equip_id          : sysuuid_x16 not null;
  priority          : abap.char(10) not null;
  status            : abap.char(15) not null;
  assigned_to       : abap.char(12);
  scheduled_date    : abap.dats;
  started_at         : timestampl;
  completed_at       : timestampl;
  downtime_hours    : abap.dec(7,2);
  completion_notes  : abap.char(255);
  cancel_note       : abap.char(255);
  created_at         : timestampl;
  changed_at         : timestampl;
}
