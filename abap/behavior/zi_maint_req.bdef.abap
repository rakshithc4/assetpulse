managed implementation in class zbp_i_maint_req unique;
strict ( 2 );
with privileged mode disabling NoAuthCheck;

define behavior for ZI_Maint_Req alias MaintReq
persistent table zmaint_req
etag master ChangedAt
lock master
authorization master ( none )
{
  create;
  update;

  field ( readonly ) Status, CreatedAt, ChangedAt;
  field ( readonly : update ) ReqId, EquipId;
  determination setinitialstatus on modify { create; }
  determination escalatecriticaltodown on modify { field Severity; }
  action ( features : instance ) ConvertToWorkOrder parameter ZA_Convert result [1] $self;
  action ( features : instance ) RejectRequest       parameter ZA_Reject  result [1] $self;

  validation ValidateRequestFields on save { field Title, Severity; }

  mapping for zmaint_req
    {
      ReqId        = req_id;
      EquipId      = equip_id;
      Title        = title;
      Description  = description;
      Severity     = severity;
      Status       = status;
      ReportedBy   = reported_by;
      RejectNote   = reject_note;
      CreatedAt    = created_at;
      ChangedAt    = changed_at;
    }
}

define authorization context NoAuthCheck
{
}

define own authorization context by privileged mode;
