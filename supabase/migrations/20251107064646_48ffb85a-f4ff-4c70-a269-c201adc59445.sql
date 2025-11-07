-- Add export_links column to plans table to store generated file URLs
ALTER TABLE plans ADD COLUMN IF NOT EXISTS export_links jsonb DEFAULT '{}'::jsonb;

-- Add share_link_active column to control public access
ALTER TABLE plans ADD COLUMN IF NOT EXISTS share_link_active boolean DEFAULT false;

-- Create terms and conditions settings table
CREATE TABLE IF NOT EXISTS plan_terms_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Terms & Conditions',
  terms text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default terms
INSERT INTO plan_terms_settings (title, terms)
VALUES (
  'Terms & Conditions',
  ARRAY[
    'All rates quoted are for the specified campaign duration only',
    'Payment terms: 50% advance, 50% upon installation completion',
    'Installation will be completed within 7 working days of advance payment',
    'Client to provide print-ready creative files in specified format',
    'Any damage to media during campaign period will be replaced at no cost',
    'Taxes and statutory levies are extra as applicable',
    'Force majeure conditions apply',
    'Any dispute is subject to Hyderabad jurisdiction only'
  ]
)
ON CONFLICT DO NOTHING;

-- RLS policies for terms
ALTER TABLE plan_terms_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view terms settings"
  ON plan_terms_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage terms settings"
  ON plan_terms_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_plan_terms_settings_updated_at
  BEFORE UPDATE ON plan_terms_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();