-- Mark stale data quality notifications as read
UPDATE notifications 
SET read = true 
WHERE category = 'data_quality' AND read = false;

-- Ensure the resolved issue stays resolved
UPDATE data_quality_issues 
SET is_resolved = true, 
    workflow_status = 'resolved', 
    resolved_at = NOW() 
WHERE record_id = 'INV/2025-26/0002' 
  AND is_resolved = false;