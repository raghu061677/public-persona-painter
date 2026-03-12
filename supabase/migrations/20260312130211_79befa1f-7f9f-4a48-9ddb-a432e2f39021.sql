
-- First update existing 4 invoices to Paid
UPDATE invoices 
SET status = 'Paid', balance_due = 0, updated_at = now()
WHERE campaign_id = 'CMP-202504-0001' 
AND billing_month IN ('2024-03', '2024-04', '2024-09', '2026-02');

-- Insert missing monthly invoices as Paid
DO $$
DECLARE
  month_rec RECORD;
  inv_id TEXT;
BEGIN
  FOR month_rec IN 
    SELECT m::date AS period_start, 
           (m + interval '1 month' - interval '1 day')::date AS period_end,
           to_char(m, 'YYYY-MM') AS billing_month
    FROM generate_series('2024-05-01'::date, '2026-01-01'::date, '1 month') AS m
    WHERE to_char(m, 'YYYY-MM') NOT IN ('2024-09')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM invoices 
      WHERE campaign_id = 'CMP-202504-0001' 
      AND billing_month = month_rec.billing_month
    ) THEN
      SELECT public.generate_invoice_id(18.0) INTO inv_id;
      
      INSERT INTO invoices (
        id, invoice_no, campaign_id, client_id, client_name, company_id,
        invoice_date, due_date, invoice_period_start, invoice_period_end,
        billing_month, is_monthly_split,
        sub_total, gst_percent, gst_amount, total_amount, balance_due,
        status, notes, created_by
      ) VALUES (
        inv_id, inv_id, 'CMP-202504-0001', 'TG-0057', 'Realplus Homes LLP', 
        '0b75c4c9-43fe-496a-9fc6-036900ebbfe0',
        month_rec.period_start, (month_rec.period_start + interval '30 days')::date,
        month_rec.period_start, month_rec.period_end,
        month_rec.billing_month, true,
        71026.67, 18.0, 12784.80, 83811.47, 0,
        'Paid', 
        'Monthly billing for RealPlus - ' || to_char(month_rec.period_start, 'Month YYYY'),
        'ab7ef697-f130-4d9e-aba5-2d452cf39251'
      );
    END IF;
  END LOOP;
END $$;
