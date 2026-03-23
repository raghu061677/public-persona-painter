-- Update payment_reminder_client templates to include campaign_name row
UPDATE email_templates 
SET html_template = REPLACE(
  html_template,
  '<tr><td style="padding:8px 0;color:#64748b;">Amount Due</td>',
  '<tr><td style="padding:8px 0;color:#64748b;">Campaign</td><td style="padding:8px 0;font-weight:600;">{{campaign_name}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Amount Due</td>'
),
updated_at = now()
WHERE template_key = 'payment_reminder_client';

-- Update payment_overdue_client templates to include campaign_name row  
UPDATE email_templates 
SET html_template = REPLACE(
  html_template,
  '<tr><td style="padding:8px 0;color:#64748b;">Amount',
  '<tr><td style="padding:8px 0;color:#64748b;">Campaign</td><td style="padding:8px 0;font-weight:600;">{{campaign_name}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Amount'
),
updated_at = now()
WHERE template_key = 'payment_overdue_client';