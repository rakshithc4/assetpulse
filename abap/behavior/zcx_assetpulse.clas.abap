CLASS zcx_assetpulse DEFINITION
  PUBLIC
  INHERITING FROM cx_static_check
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_abap_behv_message.

    CONSTANTS:
      BEGIN OF field_empty,
        msgid TYPE symsgid      VALUE 'ZASSETPULSE',
        msgno TYPE symsgno      VALUE '001',
        attr1 TYPE scx_attrname VALUE 'FIELD_NAME',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF field_empty,
      BEGIN OF negative_downtime,
        msgid TYPE symsgid      VALUE 'ZASSETPULSE',
        msgno TYPE symsgno      VALUE '002',
        attr1 TYPE scx_attrname VALUE '',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF negative_downtime,
      BEGIN OF schedule_in_past,
        msgid TYPE symsgid      VALUE 'ZASSETPULSE',
        msgno TYPE symsgno      VALUE '003',
        attr1 TYPE scx_attrname VALUE '',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF schedule_in_past,
      BEGIN OF invalid_domain_value,
        msgid TYPE symsgid      VALUE 'ZASSETPULSE',
        msgno TYPE symsgno      VALUE '004',
        attr1 TYPE scx_attrname VALUE 'FIELD_VALUE',
        attr2 TYPE scx_attrname VALUE 'FIELD_NAME',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF invalid_domain_value.

    DATA field_name  TYPE string.
    DATA field_value TYPE string.

    METHODS constructor
      IMPORTING
        textid     LIKE if_t100_message=>t100key OPTIONAL
        previous   LIKE previous OPTIONAL
        field_name  TYPE string OPTIONAL
        field_value TYPE string OPTIONAL.
ENDCLASS.

CLASS zcx_assetpulse IMPLEMENTATION.
  METHOD constructor.
    super->constructor( previous = previous ).
    me->field_name  = field_name.
    me->field_value = field_value.
    IF textid IS INITIAL.
      if_t100_message~t100key = if_t100_message=>default_textid.
    ELSE.
      if_t100_message~t100key = textid.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
