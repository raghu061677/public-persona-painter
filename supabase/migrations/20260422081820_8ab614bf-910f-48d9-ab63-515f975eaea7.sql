-- Fix: Allow invoice ID rename during finalization by adding ON UPDATE CASCADE
-- to all foreign keys referencing public.invoices(id).

-- 1) invoice_line_items
ALTER TABLE public.invoice_line_items
  DROP CONSTRAINT IF EXISTS invoice_line_items_invoice_id_fkey;
ALTER TABLE public.invoice_line_items
  ADD CONSTRAINT invoice_line_items_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- 2) invoice_items
ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- 3) credit_notes
ALTER TABLE public.credit_notes
  DROP CONSTRAINT IF EXISTS credit_notes_invoice_id_fkey;
ALTER TABLE public.credit_notes
  ADD CONSTRAINT credit_notes_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
  ON UPDATE CASCADE;

-- 4) receipts
ALTER TABLE public.receipts
  DROP CONSTRAINT IF EXISTS receipts_invoice_id_fkey;
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
  ON UPDATE CASCADE;

-- 5) invoice_reminders
ALTER TABLE public.invoice_reminders
  DROP CONSTRAINT IF EXISTS invoice_reminders_invoice_id_fkey;
ALTER TABLE public.invoice_reminders
  ADD CONSTRAINT invoice_reminders_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- 6) payment_confirmations
ALTER TABLE public.payment_confirmations
  DROP CONSTRAINT IF EXISTS payment_confirmations_invoice_id_fkey;
ALTER TABLE public.payment_confirmations
  ADD CONSTRAINT payment_confirmations_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- 7) campaign_charge_items (the one that triggered this error)
ALTER TABLE public.campaign_charge_items
  DROP CONSTRAINT IF EXISTS campaign_charge_items_invoice_id_fkey;
ALTER TABLE public.campaign_charge_items
  ADD CONSTRAINT campaign_charge_items_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
  ON UPDATE CASCADE ON DELETE SET NULL;