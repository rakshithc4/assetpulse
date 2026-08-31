CLASS lhc_maintrequest DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    METHODS setinitialstatus FOR DETERMINE ON MODIFY
      IMPORTING keys FOR MaintRequest~setinitialstatus.

    METHODS escalatecriticaltodown FOR DETERMINE ON MODIFY
      IMPORTING keys FOR MaintRequest~escalatecriticaltodown.

    METHODS validaterequestfields FOR VALIDATE ON SAVE
      IMPORTING keys FOR MaintRequest~validaterequestfields.

    METHODS rejectrequest FOR MODIFY
      IMPORTING keys FOR ACTION MaintRequest~rejectrequest RESULT result.

    METHODS converttoworkorder FOR MODIFY
      IMPORTING keys FOR ACTION MaintRequest~converttoworkorder RESULT result.

    METHODS get_instance_features FOR INSTANCE FEATURES
      IMPORTING keys REQUEST requested_features FOR MaintRequest RESULT result.
ENDCLASS.

CLASS lhc_maintrequest IMPLEMENTATION.

  METHOD setinitialstatus.
    MODIFY ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        UPDATE FIELDS ( Status )
        WITH VALUE #( FOR key IN keys ( %tky = key-%tky Status = 'REPORTED' ) ).
  ENDMETHOD.

  METHOD escalatecriticaltodown.
    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Severity EquipId ) WITH CORRESPONDING #( keys )
      RESULT DATA(requests).

    DATA equip_updates TYPE TABLE FOR UPDATE zi_ap_equipment\\Equipment.

    LOOP AT requests INTO DATA(req) WHERE Severity = 'CRITICAL'.
      APPEND VALUE #( EquipId = req-EquipId OpStatus = 'DOWN' ) TO equip_updates.
    ENDLOOP.

    IF equip_updates IS NOT INITIAL.
      MODIFY ENTITIES OF zi_ap_equipment IN LOCAL MODE
        ENTITY Equipment
          UPDATE FIELDS ( OpStatus )
          WITH equip_updates.
    ENDIF.
  ENDMETHOD.

  METHOD validaterequestfields.
    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Title Severity ) WITH CORRESPONDING #( keys )
      RESULT DATA(requests).

    DATA(valid_severities) = VALUE string_table( ( `LOW` ) ( `MEDIUM` ) ( `HIGH` ) ( `CRITICAL` ) ).

    LOOP AT requests INTO DATA(req).
      IF req-Title IS INITIAL.
        APPEND VALUE #( %tky = req-%tky ) TO failed-maintrequest.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>field_empty field_name = 'Title' )
                         %tky = req-%tky )
               TO reported-maintrequest.
      ENDIF.

      IF NOT line_exists( valid_severities[ table_line = req-Severity ] ).
        APPEND VALUE #( %tky = req-%tky ) TO failed-maintrequest.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid      = zcx_assetpulse=>invalid_domain_value
                                                     field_name  = 'Severity'
                                                     field_value = CONV string( req-Severity ) )
                         %tky = req-%tky )
               TO reported-maintrequest.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.

  METHOD rejectrequest.
    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Severity EquipId ) WITH CORRESPONDING #( keys )
      RESULT DATA(requests).

    DATA(valid_keys) = keys.
    DELETE valid_keys WHERE %param-Note IS INITIAL.

    LOOP AT keys INTO DATA(bad_key) WHERE %param-Note IS INITIAL.
      APPEND VALUE #( %tky = bad_key-%tky ) TO failed-maintrequest.
      APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>field_empty field_name = 'Note' )
                       %tky = bad_key-%tky )
             TO reported-maintrequest.
    ENDLOOP.

    IF valid_keys IS NOT INITIAL.
      MODIFY ENTITIES OF zi_maint_req IN LOCAL MODE
        ENTITY MaintRequest
          UPDATE FIELDS ( Status RejectNote )
          WITH VALUE #( FOR key IN valid_keys (
            %tky       = key-%tky
            Status     = 'REJECTED'
            RejectNote = key-%param-Note ) ).

      DATA equip_updates TYPE TABLE FOR UPDATE zi_ap_equipment\\Equipment.
      LOOP AT requests INTO DATA(req).
        READ TABLE valid_keys WITH KEY %tky = req-%tky TRANSPORTING NO FIELDS.
        CHECK sy-subrc = 0 AND req-Severity = 'CRITICAL'.
        APPEND VALUE #( EquipId = req-EquipId OpStatus = 'OPERATIONAL' ) TO equip_updates.
      ENDLOOP.

      IF equip_updates IS NOT INITIAL.
        MODIFY ENTITIES OF zi_ap_equipment IN LOCAL MODE
          ENTITY Equipment
            UPDATE FIELDS ( OpStatus )
            WITH equip_updates.
      ENDIF.
    ENDIF.

    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

  METHOD converttoworkorder.
    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Severity EquipId ) WITH CORRESPONDING #( keys )
      RESULT DATA(requests).

    MODIFY ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        UPDATE FIELDS ( Status )
        WITH VALUE #( FOR key IN keys ( %tky = key-%tky Status = 'CONVERTED' ) ).

    DATA work_orders TYPE TABLE FOR CREATE zi_work_order\\WorkOrder.

    LOOP AT keys INTO DATA(key).
      READ TABLE requests INTO DATA(req) WITH KEY %tky = key-%tky.
      CHECK sy-subrc = 0.
      DATA(priority) = COND #( WHEN key-%param-Priority IS NOT INITIAL THEN key-%param-Priority ELSE req-Severity ).
      APPEND VALUE #( %cid            = |WO_{ sy-uuid }|
                       ReqId          = key-ReqId
                       EquipId        = req-EquipId
                       Priority       = priority
                       Status         = 'CREATED' )
             TO work_orders.
    ENDLOOP.

    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        CREATE FIELDS ( ReqId EquipId Priority Status )
        WITH work_orders
      MAPPED DATA(mapped)
      FAILED DATA(create_failed)
      REPORTED DATA(create_reported).

    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

  METHOD get_instance_features.
    READ ENTITIES OF zi_maint_req IN LOCAL MODE
      ENTITY MaintRequest
        FIELDS ( Status ) WITH CORRESPONDING #( keys )
      RESULT DATA(requests).

    result = VALUE #( FOR req IN requests (
      %tky                      = req-%tky
      %action-RejectRequest      = COND #( WHEN req-Status = 'REPORTED' THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
      %action-ConvertToWorkOrder = COND #( WHEN req-Status = 'REPORTED' THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
    ) ).
  ENDMETHOD.

ENDCLASS.
