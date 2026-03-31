UPDATE invoices 
SET tax_type = 'igst', 
    gst_mode = 'IGST',
    igst_amount = gst_amount,
    igst_percent = gst_percent,
    cgst_amount = 0,
    sgst_amount = 0,
    cgst_percent = 0,
    sgst_percent = 0,
    updated_at = now()
WHERE id = 'INV/2025-26/0062';