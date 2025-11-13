-- Add PPT template settings to organization_settings
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS ppt_template_name TEXT DEFAULT 'Modern Professional',
ADD COLUMN IF NOT EXISTS ppt_primary_color TEXT DEFAULT '#1E40AF',
ADD COLUMN IF NOT EXISTS ppt_secondary_color TEXT DEFAULT '#10B981',
ADD COLUMN IF NOT EXISTS ppt_accent_color TEXT DEFAULT '#F59E0B',
ADD COLUMN IF NOT EXISTS ppt_layout_style TEXT DEFAULT 'modern',
ADD COLUMN IF NOT EXISTS ppt_include_company_logo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ppt_watermark_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ppt_footer_text TEXT DEFAULT 'Confidential - For Client Review Only',
ADD COLUMN IF NOT EXISTS auto_generate_ppt_on_completion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_manager_on_ppt_generation BOOLEAN DEFAULT true;