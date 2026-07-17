managed implementation in class zbp_i_work_order unique;
strict ( 2 );

define behavior for ZI_Work_Order alias WorkOrder
persistent table zwork_order
etag master ChangedAt
lock master
authorization master ( instance )
{
  create ( internal );
  update;

  field ( readonly ) OrderId, ReqId, EquipId, CreatedAt, ChangedAt;
  field ( readonly ) Status, StartedAt, CompletedAt;

  action ( features : instance ) Schedule     parameter ZA_Schedule  result [1] $self;
  action ( features : instance ) StartWork                           result [1] $self;
  action ( features : instance ) CompleteWork parameter ZA_Complete  result [1] $self;
  action ( features : instance ) CancelOrder  parameter ZA_Cancel    result [1] $self;

  validation ValidateOrderFields on save { field Priority, ScheduledDate, DowntimeHours; }

  mapping for zwork_order
    {
      OrderId          = order_id;
      ReqId            = req_id;
      EquipId          = equip_id;
      Priority         = priority;
      Status           = status;
      AssignedTo       = assigned_to;
      ScheduledDate    = scheduled_date;
      StartedAt        = started_at;
      CompletedAt      = completed_at;
      DowntimeHours    = downtime_hours;
      CompletionNotes  = completion_notes;
      CancelNote       = cancel_note;
      CreatedAt        = created_at;
      ChangedAt        = changed_at;
    }
}
