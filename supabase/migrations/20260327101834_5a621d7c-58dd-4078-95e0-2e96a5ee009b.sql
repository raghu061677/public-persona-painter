UPDATE plan_items 
SET discount_amount = 0, 
    subtotal = sales_price + COALESCE(printing_charges, 0) + COALESCE(mounting_charges, 0),
    total_with_gst = (sales_price + COALESCE(printing_charges, 0) + COALESCE(mounting_charges, 0)) * 1.18
WHERE plan_id = 'PLAN-202603-0028' AND subtotal < 0;