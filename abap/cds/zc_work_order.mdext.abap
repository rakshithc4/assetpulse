@Metadata.layer: #CORE
@UI: {
  headerInfo: { typeName: 'Work Order', typeNamePlural: 'Work Orders',
                title: { type: #STANDARD, value: 'OrderId' } }
}
annotate view ZC_Work_Order with
{
  @UI.lineItem: [ { position: 10, label: 'Priority' } ]
  Priority;

  @UI.lineItem: [ { position: 20, label: 'Status' } ]
  @UI.identification: [ { position: 10 } ]
  Status;

  @UI.lineItem: [ { position: 30, label: 'Assigned to' } ]
  AssignedTo;

  @UI.lineItem: [ { position: 40, label: 'Scheduled' } ]
  ScheduledDate;
}
