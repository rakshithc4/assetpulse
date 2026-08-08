managed implementation in class zbp_i_equipment unique;
strict ( 2 );

define behavior for ZI_Equipment alias Equipment
persistent table zequipment
etag master ChangedAt
lock master
authorization master ( instance )
{
  create;
  update;

  field ( readonly ) EquipId, CreatedAt, ChangedAt;
  field ( readonly : update ) EquipTag;

  determination SetInitialStatus on modify { create; }

  validation ValidateEquipmentFields on save { create; update; }

  mapping for zequipment
    {
      EquipId     = equip_id;
      EquipTag    = equip_tag;
      Name        = name;
      EquipType   = equip_type;
      Site        = site;
      Criticality = criticality;
      OpStatus    = op_status;
      InstalledOn = installed_on;
      CreatedAt   = created_at;
      ChangedAt   = changed_at;
    }
}
