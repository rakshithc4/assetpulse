@Metadata.layer: #CORE
@UI: {
  headerInfo: { typeName: 'Maintenance Request', typeNamePlural: 'Maintenance Requests',
                title: { type: #STANDARD, value: 'Title' } }
}
annotate view ZC_Maint_Req with
{
  @UI.lineItem: [ { position: 10, label: 'Title' } ]
  @UI.identification: [ { position: 10 } ]
  Title;

  @UI.lineItem: [ { position: 20, label: 'Severity' } ]
  Severity;

  @UI.lineItem: [ { position: 30, label: 'Status' } ]
  Status;

  @UI.lineItem: [ { position: 40, label: 'Reported by' } ]
  ReportedBy;
}
