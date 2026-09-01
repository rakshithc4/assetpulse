managed implementation in class zbp_i_maint_req unique;
strict ( 2 );

define behavior for ZI_Maint_Req alias MaintReq
persistent table zmaint_req
etag master ChangedAt
lock master
authorization master ( instance )
{
  create;
  update ( create );

  field ( readonly ) ReqId, CreatedAt, ChangedAt;
  field ( readonly ) Status;
  field ( mandatory ) EquipId, Title, Severity, ReportedBy;

  action ( features : instance ) RejectRequest      parameter ZA_Reject      result [1] $self;
  action ( features : instance ) ConvertToWorkOrder  parameter ZA_Convert     result [1] $self;

  determination SetInitialStatus       on modify { create; }
  determination EscalateCriticalToDown on modify { create; }

  validation ValidateRequestFields on save { create; }

  mapping for zmaint_req
    {
      ReqId       = req_id;
      EquipId     = equip_id;
      Title       = title;
      Description = description;
      Severity    = severity;
      Status      = status;
      ReportedBy  = reported_by;
      RejectNote  = reject_note;
      CreatedAt   = created_at;
      ChangedAt   = changed_at;
    }
}
