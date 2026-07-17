@Metadata.layer: #CORE
@UI: {
  headerInfo: { typeName: 'Equipment', typeNamePlural: 'Equipment',
                title: { type: #STANDARD, value: 'EquipTag' } }
}
annotate view ZC_Equipment with
{
  @UI.facet: [ { id: 'General', purpose: #STANDARD, type: #IDENTIFICATION_REFERENCE, label: 'General', position: 10 } ]
  @UI.lineItem: [ { position: 10, label: 'Tag' } ]
  @UI.identification: [ { position: 10 } ]
  EquipTag;

  @UI.lineItem: [ { position: 20, label: 'Name' } ]
  @UI.identification: [ { position: 20 } ]
  Name;

  @UI.lineItem: [ { position: 30, label: 'Type' } ]
  EquipType;

  @UI.lineItem: [ { position: 40, label: 'Site' } ]
  Site;

  @UI.lineItem: [ { position: 50, label: 'Criticality' } ]
  Criticality;

  @UI.lineItem: [ { position: 60, label: 'Status' } ]
  OpStatus;
}
