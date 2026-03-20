
-- =============================================================
-- DATABASE HARDENING — Production-Safe Rollout
-- =============================================================
-- Pre-conditions applied:
--   1. INV/2025-26/0002 due_date corrected (Phase 0)
--   2. 9 campaign_assets rows with negative total_price clamped to 0
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- PHASE 1: Non-negative money CHECK constraints
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.payment_confirmations
  ADD CONSTRAINT chk_payment_confirmations_claimed_amount_non_neg
  CHECK (claimed_amount >= 0);

ALTER TABLE public.invoices
  ADD CONSTRAINT chk_invoices_sub_total_non_neg
  CHECK (sub_total >= 0);

ALTER TABLE public.invoices
  ADD CONSTRAINT chk_invoices_total_amount_non_neg
  CHECK (total_amount >= 0);

ALTER TABLE public.campaign_assets
  ADD CONSTRAINT chk_campaign_assets_total_price_non_neg
  CHECK (total_price >= 0 OR total_price IS NULL);

ALTER TABLE public.campaign_assets
  ADD CONSTRAINT chk_campaign_assets_negotiated_rate_non_neg
  CHECK (negotiated_rate >= 0 OR negotiated_rate IS NULL);

ALTER TABLE public.media_assets
  ADD CONSTRAINT chk_media_assets_card_rate_non_neg
  CHECK (card_rate >= 0 OR card_rate IS NULL);

-- ─────────────────────────────────────────────────────────────
-- PHASE 2: Date-range CHECK constraints
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.campaign_assets
  ADD CONSTRAINT chk_campaign_assets_booking_date_range
  CHECK (booking_end_date >= booking_start_date
         OR booking_start_date IS NULL
         OR booking_end_date IS NULL);

ALTER TABLE public.campaign_assets
  ADD CONSTRAINT chk_campaign_assets_date_range
  CHECK (end_date >= start_date
         OR start_date IS NULL
         OR end_date IS NULL);

ALTER TABLE public.campaigns
  ADD CONSTRAINT chk_campaigns_date_range
  CHECK (end_date >= start_date
         OR start_date IS NULL
         OR end_date IS NULL);

ALTER TABLE public.invoices
  ADD CONSTRAINT chk_invoices_due_after_invoice
  CHECK (due_date >= invoice_date
         OR invoice_date IS NULL
         OR due_date IS NULL);

-- ─────────────────────────────────────────────────────────────
-- PHASE 3: Foreign keys (NOT VALID + VALIDATE for zero-downtime)
-- ─────────────────────────────────────────────────────────────

-- invoices.client_id → clients(id)
ALTER TABLE public.invoices
  ADD CONSTRAINT fk_invoices_client_id
  FOREIGN KEY (client_id) REFERENCES public.clients(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.invoices
  VALIDATE CONSTRAINT fk_invoices_client_id;

-- campaigns.client_id → clients(id)
ALTER TABLE public.campaigns
  ADD CONSTRAINT fk_campaigns_client_id
  FOREIGN KEY (client_id) REFERENCES public.clients(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.campaigns
  VALIDATE CONSTRAINT fk_campaigns_client_id;

-- payment_confirmations.client_id → clients(id)
ALTER TABLE public.payment_confirmations
  ADD CONSTRAINT fk_payment_confirmations_client_id
  FOREIGN KEY (client_id) REFERENCES public.clients(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.payment_confirmations
  VALIDATE CONSTRAINT fk_payment_confirmations_client_id;
