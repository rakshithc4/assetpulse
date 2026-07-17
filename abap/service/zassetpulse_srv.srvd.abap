@EndUserText.label: 'AssetPulse service'
define service ZASSETPULSE_SRV {
  expose ZC_Equipment as Equipment;
  expose ZC_Maint_Req as MaintenanceRequest;
  expose ZC_Work_Order as WorkOrder;
}
