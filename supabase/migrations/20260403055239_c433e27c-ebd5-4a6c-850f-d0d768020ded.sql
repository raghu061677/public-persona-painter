-- Function to sync invoice_items → invoices.items JSONB
CREATE OR REPLACE FUNCTION public.sync_invoice_items_to_jsonb()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_invoice_id text;
  rebuilt jsonb;
BEGIN
  -- Determine which invoice to update
  IF TG_OP = 'DELETE' THEN
    target_invoice_id := OLD.invoice_id;
  ELSE
    target_invoice_id := NEW.invoice_id;
  END IF;

  -- Rebuild JSONB array from invoice_items
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ii.id,
      'asset_code', ii.asset_code,
      'description', ii.description,
      'location', ii.location,
      'area', ii.area,
      'direction', ii.direction,
      'media_type', ii.media_type,
      'illumination', ii.illumination,
      'dimension_text', ii.dimension_text,
      'hsn_sac', ii.hsn_sac,
      'bill_start_date', ii.bill_start_date,
      'bill_end_date', ii.bill_end_date,
      'billable_days', ii.billable_days,
      'rate_type', ii.rate_type,
      'rate_value', ii.rate_value,
      'base_amount', ii.base_amount,
      'printing_cost', ii.printing_cost,
      'mounting_cost', ii.mounting_cost,
      'line_total', ii.line_total,
      'quantity', ii.quantity,
      'unit', ii.unit,
      'gst_rate', ii.gst_rate,
      'cgst_amount', ii.cgst_amount,
      'sgst_amount', ii.sgst_amount,
      'igst_amount', ii.igst_amount
    )
  ), '[]'::jsonb) INTO rebuilt
  FROM invoice_items ii
  WHERE ii.invoice_id = target_invoice_id;

  -- Update the invoices.items JSONB column
  UPDATE invoices SET items = rebuilt WHERE id = target_invoice_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on invoice_items
DROP TRIGGER IF EXISTS trg_sync_invoice_items_jsonb ON invoice_items;
CREATE TRIGGER trg_sync_invoice_items_jsonb
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_invoice_items_to_jsonb();