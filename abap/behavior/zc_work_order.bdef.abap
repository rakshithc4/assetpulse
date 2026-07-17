projection;
strict ( 2 );

define behavior for ZC_Work_Order alias WorkOrder
{
  use update;

  use action Schedule;
  use action StartWork;
  use action CompleteWork;
  use action CancelOrder;
}
