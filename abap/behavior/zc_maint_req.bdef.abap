projection;
strict ( 2 );

define behavior for ZC_Maint_Req alias MaintReq
{
  use create;
  use update;

  use action RejectRequest;
  use action ConvertToWorkOrder;
}
