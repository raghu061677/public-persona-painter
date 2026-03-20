
ALTER TABLE public.companies ADD COLUMN terms_conditions text[] DEFAULT ARRAY[
  'Payment: 100% advance or within 7 days from invoice date',
  'GST extra as applicable',
  'TDS (if applicable) must be deposited under our PAN & Form 16A to be shared within timeline',
  'Media subject to availability; blocking valid for 24 hours with written confirmation',
  'Campaign duration as per agreed dates; extension to be informed 7–10 days prior',
  'Printing & mounting charges extra unless specified',
  'No liability for flex damage, theft, or wear & tear after installation',
  'Replacement (if required) will be charged additionally',
  'Any discrepancies must be reported within 48 hours',
  'Jurisdiction: Hyderabad'
];

-- Backfill existing companies
UPDATE public.companies SET terms_conditions = ARRAY[
  'Payment: 100% advance or within 7 days from invoice date',
  'GST extra as applicable',
  'TDS (if applicable) must be deposited under our PAN & Form 16A to be shared within timeline',
  'Media subject to availability; blocking valid for 24 hours with written confirmation',
  'Campaign duration as per agreed dates; extension to be informed 7–10 days prior',
  'Printing & mounting charges extra unless specified',
  'No liability for flex damage, theft, or wear & tear after installation',
  'Replacement (if required) will be charged additionally',
  'Any discrepancies must be reported within 48 hours',
  'Jurisdiction: Hyderabad'
] WHERE terms_conditions IS NULL;
