CLASS lhc_equipment DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    METHODS setinitialstatus FOR DETERMINE ON MODIFY
      IMPORTING keys FOR Equipment~setinitialstatus.

    METHODS validateequipmentfields FOR VALIDATE ON SAVE
      IMPORTING keys FOR Equipment~validateequipmentfields.
ENDCLASS.

CLASS lhc_equipment IMPLEMENTATION.

  METHOD setinitialstatus.
    MODIFY ENTITIES OF zi_equipment IN LOCAL MODE
      ENTITY Equipment
        UPDATE FIELDS ( op_status )
        WITH VALUE #( FOR key IN keys ( %tky = key-%tky OpStatus = 'OPERATIONAL' ) ).
  ENDMETHOD.

  METHOD validateequipmentfields.
    READ ENTITIES OF zi_equipment IN LOCAL MODE
      ENTITY Equipment
        FIELDS ( EquipType Criticality Site Name ) WITH CORRESPONDING #( keys )
      RESULT DATA(equipment).

    DATA(valid_types)        = VALUE string_table( ( `CRUSHER` ) ( `CONVEYOR` ) ( `PUMP` ) ( `HAUL_TRUCK` ) ( `DRILL` ) ).
    DATA(valid_criticalities) = VALUE string_table( ( `LOW` ) ( `MEDIUM` ) ( `HIGH` ) ( `CRITICAL` ) ).

    LOOP AT equipment INTO DATA(equip).
      IF equip-Name IS INITIAL.
        APPEND VALUE #( %tky = equip-%tky ) TO reported-equipment.
        APPEND VALUE #( %tky = equip-%tky ) TO failed-equipment.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid     = zcx_assetpulse=>field_empty
                                                     field_name = 'Name' )
                         %tky = equip-%tky )
               TO reported-equipment.
      ENDIF.

      IF equip-Site IS INITIAL.
        APPEND VALUE #( %tky = equip-%tky ) TO failed-equipment.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid     = zcx_assetpulse=>field_empty
                                                     field_name = 'Site' )
                         %tky = equip-%tky )
               TO reported-equipment.
      ENDIF.

      IF NOT line_exists( valid_types[ table_line = equip-EquipType ] ).
        APPEND VALUE #( %tky = equip-%tky ) TO failed-equipment.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid      = zcx_assetpulse=>invalid_domain_value
                                                     field_name  = 'EquipType'
                                                     field_value = equip-EquipType )
                         %tky = equip-%tky )
               TO reported-equipment.
      ENDIF.

      IF NOT line_exists( valid_criticalities[ table_line = equip-Criticality ] ).
        APPEND VALUE #( %tky = equip-%tky ) TO failed-equipment.
        APPEND VALUE #( %msg = NEW zcx_assetpulse( textid      = zcx_assetpulse=>invalid_domain_value
                                                     field_name  = 'Criticality'
                                                     field_value = equip-Criticality )
                         %tky = equip-%tky )
               TO reported-equipment.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.

ENDCLASS.
