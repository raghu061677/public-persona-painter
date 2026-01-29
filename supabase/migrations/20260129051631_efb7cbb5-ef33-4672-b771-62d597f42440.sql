-- Make client creation collision-proof and return accurate conflict messages
CREATE OR REPLACE FUNCTION public.create_client_with_id(
  p_company_id uuid,
  p_state_code text,
  p_name text,
  p_client_type text DEFAULT 'Business'::text,
  p_company_name text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_phone text DEFAULT NULL::text,
  p_gst_number text DEFAULT NULL::text,
  p_state text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_billing_address_line1 text DEFAULT NULL::text,
  p_billing_address_line2 text DEFAULT NULL::text,
  p_billing_city text DEFAULT NULL::text,
  p_billing_state text DEFAULT NULL::text,
  p_billing_pincode text DEFAULT NULL::text,
  p_shipping_address_line1 text DEFAULT NULL::text,
  p_shipping_address_line2 text DEFAULT NULL::text,
  p_shipping_city text DEFAULT NULL::text,
  p_shipping_state text DEFAULT NULL::text,
  p_shipping_pincode text DEFAULT NULL::text,
  p_shipping_same_as_billing boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id text;
  v_next_seq integer;
  v_max_existing integer;
  v_attempt integer := 0;
BEGIN
  -- 1) Friendly validation: GST already exists for this company
  IF NULLIF(TRIM(p_gst_number), '') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.clients
      WHERE company_id = p_company_id
        AND gst_number = NULLIF(TRIM(p_gst_number), '')
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'client_id', null,
        'message', 'A client with this GST number already exists in your company.'
      );
    END IF;
  END IF;

  -- 2) Get or create the sequence (locked) and reserve next id
  SELECT current_value + 1 INTO v_next_seq
  FROM public.code_counters
  WHERE counter_type = 'CLIENT'
    AND counter_key = UPPER(p_state_code)
    AND period = 'permanent'
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.code_counters
    SET current_value = v_next_seq,
        updated_at = now()
    WHERE counter_type = 'CLIENT'
      AND counter_key = UPPER(p_state_code)
      AND period = 'permanent';
  ELSE
    SELECT COALESCE(MAX(
      CASE 
        WHEN id ~ '-[0-9]+$' 
        THEN CAST(SUBSTRING(id FROM '[0-9]+$') AS integer)
        ELSE 0
      END
    ), 0)
    INTO v_max_existing
    FROM public.clients
    WHERE id LIKE UPPER(p_state_code) || '-%'
      AND company_id = p_company_id;

    v_next_seq := v_max_existing + 1;

    INSERT INTO public.code_counters (
      counter_type,
      counter_key,
      period,
      current_value,
      created_at,
      updated_at
    ) VALUES (
      'CLIENT',
      UPPER(p_state_code),
      'permanent',
      v_next_seq,
      now(),
      now()
    )
    ON CONFLICT (counter_type, counter_key, period)
    DO UPDATE SET
      current_value = public.code_counters.current_value + 1,
      updated_at = now()
    RETURNING current_value INTO v_next_seq;
  END IF;

  -- 3) Insert with retry on rare id collision
  LOOP
    v_attempt := v_attempt + 1;
    v_client_id := UPPER(p_state_code) || '-' || LPAD(v_next_seq::text, 4, '0');

    BEGIN
      INSERT INTO public.clients (
        id,
        company_id,
        name,
        client_type,
        company,
        email,
        phone,
        gst_number,
        state,
        city,
        notes,
        billing_address_line1,
        billing_address_line2,
        billing_city,
        billing_state,
        billing_pincode,
        shipping_address_line1,
        shipping_address_line2,
        shipping_city,
        shipping_state,
        shipping_pincode,
        shipping_same_as_billing,
        created_at,
        updated_at
      ) VALUES (
        v_client_id,
        p_company_id,
        p_name,
        p_client_type::client_type,
        p_company_name,
        NULLIF(TRIM(p_email), ''),
        NULLIF(TRIM(p_phone), ''),
        NULLIF(TRIM(p_gst_number), ''),
        p_state,
        NULLIF(TRIM(p_city), ''),
        NULLIF(TRIM(p_notes), ''),
        NULLIF(TRIM(p_billing_address_line1), ''),
        NULLIF(TRIM(p_billing_address_line2), ''),
        NULLIF(TRIM(p_billing_city), ''),
        p_billing_state,
        NULLIF(TRIM(p_billing_pincode), ''),
        NULLIF(TRIM(p_shipping_address_line1), ''),
        NULLIF(TRIM(p_shipping_address_line2), ''),
        NULLIF(TRIM(p_shipping_city), ''),
        p_shipping_state,
        NULLIF(TRIM(p_shipping_pincode), ''),
        p_shipping_same_as_billing,
        now(),
        now()
      );

      RETURN jsonb_build_object(
        'success', true,
        'client_id', v_client_id,
        'message', 'Client created successfully'
      );

    EXCEPTION
      WHEN unique_violation THEN
        -- Could be ID collision (clients_pkey) OR GST uniqueness. If GST, return correct message.
        IF NULLIF(TRIM(p_gst_number), '') IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.clients
          WHERE company_id = p_company_id
            AND gst_number = NULLIF(TRIM(p_gst_number), '')
        ) THEN
          RETURN jsonb_build_object(
            'success', false,
            'client_id', null,
            'message', 'A client with this GST number already exists in your company.'
          );
        END IF;

        -- Otherwise assume ID collision; advance sequence and retry a few times.
        IF v_attempt >= 5 THEN
          RETURN jsonb_build_object(
            'success', false,
            'client_id', null,
            'message', 'Client ID generation conflict detected. Please try again.'
          );
        END IF;

        v_next_seq := v_next_seq + 1;
        UPDATE public.code_counters
        SET current_value = v_next_seq,
            updated_at = now()
        WHERE counter_type = 'CLIENT'
          AND counter_key = UPPER(p_state_code)
          AND period = 'permanent';
    END;
  END LOOP;
END;
$function$;