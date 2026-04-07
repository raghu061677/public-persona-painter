
-- Add missing fields to campaigns.list field catalog
INSERT INTO page_field_catalog (page_key, field_key, label, group_name, data_type, is_default, is_exportable, is_filterable, sort_order, width)
VALUES
  ('campaigns.list', 'invoice_status', 'Invoice Status', 'Finance', 'text', true, true, true, 12, 130),
  ('campaigns.list', 'invoice_progress', 'Progress', 'Finance', 'number', true, true, false, 13, 100)
ON CONFLICT DO NOTHING;

-- Remove duplicate Ops View and Client Share View presets (keep only one of each)
DELETE FROM list_view_presets
WHERE page_key = 'campaigns.list'
  AND preset_name = 'Ops View'
  AND id != (
    SELECT id FROM list_view_presets
    WHERE page_key = 'campaigns.list' AND preset_name = 'Ops View'
    ORDER BY created_at ASC LIMIT 1
  );

DELETE FROM list_view_presets
WHERE page_key = 'campaigns.list'
  AND preset_name = 'Client Share View'
  AND id != (
    SELECT id FROM list_view_presets
    WHERE page_key = 'campaigns.list' AND preset_name = 'Client Share View'
    ORDER BY created_at ASC LIMIT 1
  );
