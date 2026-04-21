-- Defense-in-depth: ensure charge items are released when their invoice is deleted

-- 1) Trigger function: release charge items when an invoice row is deleted
CREATE OR REPLACE FUNCTION public.release_charge_items_on_invoice_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.campaign_charge_items
     SET is_invoiced = false,
         invoice_id  = NULL
   WHERE invoice_id = OLD.id;
  RETURN OLD;
END;
$$;

-- 2) Attach trigger BEFORE DELETE on invoices (idempotent)
DROP TRIGGER IF EXISTS trg_release_charge_items_on_invoice_delete ON public.invoices;
CREATE TRIGGER trg_release_charge_items_on_invoice_delete
BEFORE DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.release_charge_items_on_invoice_delete();

-- 3) One-time backfill: release any orphaned charges (invoice_id NULL but flagged invoiced)
UPDATE public.campaign_charge_items
   SET is_invoiced = false
 WHERE is_invoiced = true
   AND invoice_id IS NULL;
