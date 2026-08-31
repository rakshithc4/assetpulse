CLASS lhc_workorder DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    METHODS validateorderfields FOR VALIDATE ON SAVE
      IMPORTING keys FOR WorkOrder~validateorderfields.

    METHODS schedule FOR MODIFY
      IMPORTING keys FOR ACTION WorkOrder~schedule RESULT result.

    METHODS startwork FOR MODIFY
      IMPORTING keys FOR ACTION WorkOrder~startwork RESULT result.

    METHODS completework FOR MODIFY
      IMPORTING keys FOR ACTION WorkOrder~completework RESULT result.

    METHODS cancelorder FOR MODIFY
      IMPORTING keys FOR ACTION WorkOrder~cancelorder RESULT result.

    METHODS get_instance_features FOR INSTANCE FEATURES
      IMPORTING keys REQUEST requested_features FOR WorkOrder RESULT result.
ENDCLASS.

CLASS lhc_workorder IMPLEMENTATION.

  METHOD validateorderfields.
    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( Priority ScheduledDate DowntimeHours ) WITH CORRESPONDING #( keys )
      RESULT DATA(orders).

    DATA(valid_priorities) = VALUE string_table( ( `LOW` ) ( `MEDIUM` ) ( `HIGH` ) ( `CRITICAL` ) ).

    LOOP AT orders INTO DATA(order).
      IF NOT line_exists( valid_priorities[ table_line = order-Priority ] ).
        APPEND VALUE #( %tky = order-%tky ) TO failed-workorder.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid      = zcx_assetpulse=>invalid_domain_value
                                                     field_name  = 'Priority'
                                                     field_value = CONV string( order-Priority ) )
                         %tky = order-%tky )
               TO reported-workorder.
      ENDIF.

      IF order-DowntimeHours < 0.
        APPEND VALUE #( %tky = order-%tky ) TO failed-workorder.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>negative_downtime )
                         %tky = order-%tky )
               TO reported-workorder.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.

  METHOD schedule.
    DATA(today) = cl_abap_context_info=>get_system_date( ).
    DATA(valid_keys) = keys.
    DELETE valid_keys WHERE %param-ScheduledDate < today.

    LOOP AT keys INTO DATA(bad_key) WHERE %param-ScheduledDate < today.
      APPEND VALUE #( %tky = bad_key-%tky ) TO failed-workorder.
      APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>schedule_in_past )
                       %tky = bad_key-%tky )
             TO reported-workorder.
    ENDLOOP.

    IF valid_keys IS NOT INITIAL.
      MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
        ENTITY WorkOrder
          UPDATE FIELDS ( Status ScheduledDate AssignedTo )
          WITH VALUE #( FOR key IN valid_keys (
            %tky          = key-%tky
            Status        = 'SCHEDULED'
            ScheduledDate = key-%param-ScheduledDate
            AssignedTo    = key-%param-AssignedTo ) ).
    ENDIF.

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

  METHOD startwork.
    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( EquipId ) WITH CORRESPONDING #( keys )
      RESULT DATA(orders).

    MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        UPDATE FIELDS ( Status StartedAt )
        WITH VALUE #( FOR key IN keys (
          %tky      = key-%tky
          Status    = 'IN_PROGRESS'
          StartedAt = utclong_current( ) ) ).

    DATA equip_updates TYPE TABLE FOR UPDATE zi_ap_equipment\\Equipment.
    LOOP AT orders INTO DATA(order).
      APPEND VALUE #( EquipId = order-EquipId OpStatus = 'MAINTENANCE' ) TO equip_updates.
    ENDLOOP.

    MODIFY ENTITIES OF zi_ap_equipment IN LOCAL MODE
      ENTITY Equipment
        UPDATE FIELDS ( OpStatus )
        WITH equip_updates.

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

  METHOD completework.
    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( EquipId ) WITH CORRESPONDING #( keys )
      RESULT DATA(orders).

    DATA(valid_keys) = keys.
    DELETE valid_keys WHERE %param-DowntimeHours < 0.

    LOOP AT keys INTO DATA(bad_key) WHERE %param-DowntimeHours < 0.
      APPEND VALUE #( %tky = bad_key-%tky ) TO failed-workorder.
      APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>negative_downtime )
                       %tky = bad_key-%tky )
             TO reported-workorder.
    ENDLOOP.

    IF valid_keys IS NOT INITIAL.
      MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
        ENTITY WorkOrder
          UPDATE FIELDS ( Status CompletedAt CompletionNotes DowntimeHours )
          WITH VALUE #( FOR key IN valid_keys (
            %tky             = key-%tky
            Status           = 'COMPLETED'
            CompletedAt      = utclong_current( )
            CompletionNotes  = key-%param-CompletionNotes
            DowntimeHours    = key-%param-DowntimeHours ) ).

      DATA equip_updates TYPE TABLE FOR UPDATE zi_ap_equipment\\Equipment.
      LOOP AT orders INTO DATA(order).
        READ TABLE valid_keys WITH KEY %tky = order-%tky TRANSPORTING NO FIELDS.
        CHECK sy-subrc = 0.
        APPEND VALUE #( EquipId = order-EquipId OpStatus = 'OPERATIONAL' ) TO equip_updates.
      ENDLOOP.

      IF equip_updates IS NOT INITIAL.
        MODIFY ENTITIES OF zi_ap_equipment IN LOCAL MODE
          ENTITY Equipment
            UPDATE FIELDS ( OpStatus )
            WITH equip_updates.
      ENDIF.
    ENDIF.

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

  METHOD cancelorder.
    DATA(valid_keys) = keys.
    DELETE valid_keys WHERE %param-Note IS INITIAL.

    LOOP AT keys INTO DATA(bad_key) WHERE %param-Note IS INITIAL.
      APPEND VALUE #( %tky = bad_key-%tky ) TO failed-workorder.
      APPEND VALUE #( %msg = NEW zcx_assetpulse( textid = zcx_assetpulse=>field_empty field_name = 'Note' )
                       %tky = bad_key-%tky )
             TO reported-workorder.
    ENDLOOP.

    IF valid_keys IS NOT INITIAL.
      MODIFY ENTITIES OF zi_work_order IN LOCAL MODE
        ENTITY WorkOrder
          UPDATE FIELDS ( Status CancelNote )
          WITH VALUE #( FOR key IN valid_keys (
            %tky       = key-%tky
            Status     = 'CANCELLED'
            CancelNote = key-%param-Note ) ).
    ENDIF.

    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(updated).

    result = VALUE #( FOR upd IN updated ( %tky = upd-%tky %param = upd ) ).
  ENDMETHOD.

  METHOD get_instance_features.
    READ ENTITIES OF zi_work_order IN LOCAL MODE
      ENTITY WorkOrder
        FIELDS ( Status ) WITH CORRESPONDING #( keys )
      RESULT DATA(orders).

    result = VALUE #( FOR order IN orders (
      %tky                       = order-%tky
      %action-Schedule           = COND #( WHEN order-Status = 'CREATED'     THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
      %action-StartWork          = COND #( WHEN order-Status = 'SCHEDULED'   THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
      %action-CompleteWork       = COND #( WHEN order-Status = 'IN_PROGRESS' THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
      %action-CancelOrder        = COND #( WHEN order-Status = 'CREATED' OR order-Status = 'SCHEDULED' THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
    ) ).
  ENDMETHOD.

ENDCLASS.
