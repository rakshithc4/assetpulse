CLASS ztc_assetpulse DEFINITION PUBLIC FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS
  FINAL.

  PRIVATE SECTION.
    CLASS-DATA environment TYPE REF TO if_cds_test_environment.

    CLASS-METHODS class_setup.
    CLASS-METHODS class_teardown.
    METHODS teardown.

    METHODS create_equip_sets_operational           FOR TESTING RAISING cx_static_check.
    METHODS crit_request_downs_equip                FOR TESTING RAISING cx_static_check.
    METHODS reject_without_note_fails                FOR TESTING RAISING cx_static_check.
    METHODS reject_crit_restores_equip               FOR TESTING RAISING cx_static_check.
    METHODS convert_creates_work_order               FOR TESTING RAISING cx_static_check.
    METHODS schedule_in_past_fails                   FOR TESTING RAISING cx_static_check.
    METHODS schedule_sets_scheduled                  FOR TESTING RAISING cx_static_check.
    METHODS start_work_bad_from_created              FOR TESTING RAISING cx_static_check.
    METHODS start_work_sets_maintenance              FOR TESTING RAISING cx_static_check.
    METHODS complete_neg_downtime_fails              FOR TESTING RAISING cx_static_check.
    METHODS complete_restores_operational            FOR TESTING RAISING cx_static_check.
    METHODS cancel_from_created                      FOR TESTING RAISING cx_static_check.

    METHODS create_equipment
      IMPORTING criticality       TYPE string DEFAULT 'MEDIUM'
      RETURNING VALUE(equip_id)  TYPE sysuuid_x16
      RAISING   cx_static_check.

    METHODS create_request
      IMPORTING equip_id        TYPE sysuuid_x16
                severity        TYPE string DEFAULT 'MEDIUM'
      RETURNING VALUE(req_id)   TYPE sysuuid_x16
      RAISING   cx_static_check.

    METHODS convert_to_order
      IMPORTING req_id           TYPE sysuuid_x16
      RETURNING VALUE(order_id) TYPE sysuuid_x16
      RAISING   cx_static_check.

    METHODS schedule_order
      IMPORTING order_id TYPE sysuuid_x16
      RAISING   cx_static_check.

    METHODS start_order
      IMPORTING order_id TYPE sysuuid_x16
      RAISING   cx_static_check.
ENDCLASS.

CLASS ztc_assetpulse IMPLEMENTATION.

  METHOD class_setup.
    environment = cl_cds_test_environment=>create_for_multiple_cds(
      i_for_entities = VALUE #( ( i_for_entity = 'ZI_AP_EQUIPMENT' )
                                 ( i_for_entity = 'ZI_MAINT_REQ' )
                                 ( i_for_entity = 'ZI_WORK_ORDER' ) ) ).
    environment->enable_double_redirection( ).
  ENDMETHOD.

  METHOD class_teardown.
    environment->destroy( ).
  ENDMETHOD.

  METHOD teardown.
    environment->clear_doubles( ).
  ENDMETHOD.

  METHOD create_equipment.
    equip_id = cl_system_uuid=>create_uuid_x16_static( ).
    MODIFY ENTITIES OF zi_ap_equipment PRIVILEGED
      ENTITY Equipment
        CREATE FIELDS ( EquipId EquipTag Name EquipType Site Criticality )
        WITH VALUE #( ( %cid = 'EQ1' EquipId = equip_id
                         EquipTag = 'CRU-104' Name = 'Primary crusher'
                         EquipType = 'CRUSHER' Site = 'Pilbara Site A'
                         Criticality = criticality ) )
      MAPPED   DATA(mapped)
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.

    cl_abap_unit_assert=>assert_initial( act = failed-equipment ).
    cl_abap_unit_assert=>assert_not_initial( act = mapped-equipment ).
    cl_abap_unit_assert=>assert_equals( act = mapped-equipment[ 1 ]-EquipId exp = equip_id ).
  ENDMETHOD.

  METHOD create_request.
    req_id = cl_system_uuid=>create_uuid_x16_static( ).
    MODIFY ENTITIES OF zi_maint_req PRIVILEGED
      ENTITY MaintReq
        CREATE FIELDS ( ReqId EquipId Title Severity ReportedBy )
        WITH VALUE #( ( %cid = 'REQ1' ReqId = req_id
                         EquipId = equip_id Title = 'Bearing noise'
                         Severity = severity ReportedBy = 'engineer@demo' ) )
      MAPPED   DATA(mapped)
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.
  ENDMETHOD.

  METHOD convert_to_order.
    MODIFY ENTITIES OF zi_maint_req PRIVILEGED
      ENTITY MaintReq
        EXECUTE ConvertToWorkOrder FROM VALUE #( ( %key-ReqId = req_id %param-Priority = '' ) )
      MAPPED   DATA(mapped)
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.

    SELECT SINGLE OrderId FROM zi_work_order WHERE ReqId = @req_id INTO @order_id.
  ENDMETHOD.

  METHOD schedule_order.
    MODIFY ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        EXECUTE Schedule FROM VALUE #( ( %key-OrderId = order_id
                                          %param-ScheduledDate = cl_abap_context_info=>get_system_date( ) + 1
                                          %param-AssignedTo = 'tech@demo' ) ).
    COMMIT ENTITIES.
  ENDMETHOD.

  METHOD start_order.
    MODIFY ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        EXECUTE StartWork FROM VALUE #( ( %key-OrderId = order_id ) ).
    COMMIT ENTITIES.
  ENDMETHOD.

  METHOD create_equip_sets_operational.
    DATA(equip_id) = create_equipment( ).
    READ ENTITIES OF zi_ap_equipment PRIVILEGED
      ENTITY Equipment
        FIELDS ( OpStatus ) WITH VALUE #( ( %key-EquipId = equip_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-OpStatus exp = 'OPERATIONAL' ).
  ENDMETHOD.

  METHOD crit_request_downs_equip.
    DATA(equip_id) = create_equipment( ).
    create_request( equip_id = equip_id severity = 'CRITICAL' ).
    READ ENTITIES OF zi_ap_equipment PRIVILEGED
      ENTITY Equipment
        FIELDS ( OpStatus ) WITH VALUE #( ( %key-EquipId = equip_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-OpStatus exp = 'DOWN' ).
  ENDMETHOD.

  METHOD reject_without_note_fails.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).

    MODIFY ENTITIES OF zi_maint_req PRIVILEGED
      ENTITY MaintReq
        EXECUTE RejectRequest FROM VALUE #( ( %key-ReqId = req_id %param-Note = '' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).

    cl_abap_unit_assert=>assert_not_initial( act = failed-maintreq ).
  ENDMETHOD.

  METHOD reject_crit_restores_equip.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id severity = 'CRITICAL' ).

    MODIFY ENTITIES OF zi_maint_req PRIVILEGED
      ENTITY MaintReq
        EXECUTE RejectRequest FROM VALUE #( ( %key-ReqId = req_id %param-Note = 'Duplicate report' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.

    READ ENTITIES OF zi_ap_equipment PRIVILEGED
      ENTITY Equipment
        FIELDS ( OpStatus ) WITH VALUE #( ( %key-EquipId = equip_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-OpStatus exp = 'OPERATIONAL' ).
  ENDMETHOD.

  METHOD convert_creates_work_order.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id severity = 'HIGH' ).
    DATA(order_id) = convert_to_order( req_id ).

    READ ENTITIES OF zi_maint_req PRIVILEGED
      ENTITY MaintReq
        FIELDS ( Status ) WITH VALUE #( ( %key-ReqId = req_id ) )
      RESULT DATA(request_result).
    cl_abap_unit_assert=>assert_equals( act = request_result[ 1 ]-Status exp = 'CONVERTED' ).

    READ ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        FIELDS ( Status Priority ) WITH VALUE #( ( %key-OrderId = order_id ) )
      RESULT DATA(order_result).
    cl_abap_unit_assert=>assert_equals( act = order_result[ 1 ]-Status   exp = 'CREATED' ).
    cl_abap_unit_assert=>assert_equals( act = order_result[ 1 ]-Priority exp = 'HIGH' ).
  ENDMETHOD.

  METHOD schedule_in_past_fails.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).

    MODIFY ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        EXECUTE Schedule FROM VALUE #( ( %key-OrderId = order_id
                                          %param-ScheduledDate = cl_abap_context_info=>get_system_date( ) - 1
                                          %param-AssignedTo = 'tech@demo' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).

    cl_abap_unit_assert=>assert_not_initial( act = failed-workorder ).
  ENDMETHOD.

  METHOD schedule_sets_scheduled.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).
    schedule_order( order_id ).

    READ ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        FIELDS ( Status AssignedTo ) WITH VALUE #( ( %key-OrderId = order_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-Status     exp = 'SCHEDULED' ).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-AssignedTo exp = 'tech@demo' ).
  ENDMETHOD.

  METHOD start_work_bad_from_created.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).

    MODIFY ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        EXECUTE StartWork FROM VALUE #( ( %key-OrderId = order_id ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).

    cl_abap_unit_assert=>assert_not_initial( act = failed-workorder ).
  ENDMETHOD.

  METHOD start_work_sets_maintenance.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).
    schedule_order( order_id ).
    start_order( order_id ).

    READ ENTITIES OF zi_ap_equipment PRIVILEGED
      ENTITY Equipment
        FIELDS ( OpStatus ) WITH VALUE #( ( %key-EquipId = equip_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-OpStatus exp = 'MAINTENANCE' ).
  ENDMETHOD.

  METHOD complete_neg_downtime_fails.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).
    schedule_order( order_id ).
    start_order( order_id ).

    MODIFY ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        EXECUTE CompleteWork FROM VALUE #( ( %key-OrderId = order_id
                                              %param-CompletionNotes = 'Bearing replaced'
                                              %param-DowntimeHours = '-1.00' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).

    cl_abap_unit_assert=>assert_not_initial( act = failed-workorder ).
  ENDMETHOD.

  METHOD complete_restores_operational.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).
    schedule_order( order_id ).
    start_order( order_id ).

    MODIFY ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        EXECUTE CompleteWork FROM VALUE #( ( %key-OrderId = order_id
                                              %param-CompletionNotes = 'Bearing replaced'
                                              %param-DowntimeHours = '4.50' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.

    READ ENTITIES OF zi_ap_equipment PRIVILEGED
      ENTITY Equipment
        FIELDS ( OpStatus ) WITH VALUE #( ( %key-EquipId = equip_id ) )
      RESULT DATA(equip_result).
    cl_abap_unit_assert=>assert_equals( act = equip_result[ 1 ]-OpStatus exp = 'OPERATIONAL' ).

    READ ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        FIELDS ( Status DowntimeHours ) WITH VALUE #( ( %key-OrderId = order_id ) )
      RESULT DATA(order_result).
    cl_abap_unit_assert=>assert_equals( act = order_result[ 1 ]-Status        exp = 'COMPLETED' ).
    cl_abap_unit_assert=>assert_equals( act = order_result[ 1 ]-DowntimeHours exp = '4.50' ).
  ENDMETHOD.

  METHOD cancel_from_created.
    DATA(equip_id) = create_equipment( ).
    DATA(req_id) = create_request( equip_id = equip_id ).
    DATA(order_id) = convert_to_order( req_id ).

    MODIFY ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        EXECUTE CancelOrder FROM VALUE #( ( %key-OrderId = order_id %param-Note = 'No longer needed' ) )
      FAILED   DATA(failed)
      REPORTED DATA(reported).
    COMMIT ENTITIES.

    READ ENTITIES OF zi_work_order PRIVILEGED
      ENTITY WorkOrder
        FIELDS ( Status ) WITH VALUE #( ( %key-OrderId = order_id ) )
      RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( act = result[ 1 ]-Status exp = 'CANCELLED' ).
  ENDMETHOD.

ENDCLASS.
