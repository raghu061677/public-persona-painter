
-- Fix: apply_credit_note_to_invoice trigger - add ::invoice_status casts
CREATE OR REPLACE FUNCTION public.apply_credit_note_to_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC(15,2);
  v_new_balance NUMERIC(15,2);
  v_new_status TEXT;
BEGIN
  IF NEW.status = 'Issued' AND (OLD.status IS NULL OR OLD.status != 'Issued') THEN
    SELECT COALESCE(balance_due, total_amount, 0)
    INTO v_current_balance
    FROM invoices WHERE id = NEW.invoice_id;
    
    v_new_balance := GREATEST(0, v_current_balance - NEW.total_amount);
    
    IF v_new_balance <= 0 THEN
      v_new_status := 'Paid';
    ELSE
      v_new_status := 'Partial';
    END IF;
    
    UPDATE invoices
    SET balance_due = v_new_balance,
        status = v_new_status::invoice_status,
        updated_at = now()
    WHERE id = NEW.invoice_id
      AND status NOT IN ('Draft'::invoice_status, 'Cancelled'::invoice_status);
  END IF;
  
  IF NEW.status = 'Cancelled' AND OLD.status = 'Issued' THEN
    UPDATE invoices
    SET balance_due = COALESCE(balance_due, 0) + OLD.total_amount,
        status = (CASE 
          WHEN COALESCE(balance_due, 0) + OLD.total_amount >= total_amount THEN 'Sent'
          ELSE 'Partial'
        END)::invoice_status,
        updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;
  
  RETURN NEW;
END;
$$;
