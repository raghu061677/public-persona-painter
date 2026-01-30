// Invoice PDF Template Registry
import { TemplateConfig, TemplateRenderer, InvoiceData } from './types';
import { renderDefaultTemplate } from './defaultTemplate';
import { renderModernCleanTemplate } from './modernCleanTemplate';
import { renderClassicTaxTemplate } from './classicTaxTemplate';

// Template configurations
export const INVOICE_TEMPLATES: TemplateConfig[] = [
  {
    key: 'default_existing',
    name: 'Default (Existing)',
    description: 'Standard GST-compliant invoice with improved layout',
    version: 1,
  },
  {
    key: 'modern_clean',
    name: 'Modern Clean',
    description: 'Minimal, professional design for agencies and premium brands',
    version: 1,
  },
  {
    key: 'classic_tax_invoice',
    name: 'Classic Tax Invoice',
    description: 'Conservative, audit-friendly format with boxed sections',
    version: 1,
  },
];

// Template renderer map
const templateRenderers: Record<string, TemplateRenderer> = {
  'default_existing': renderDefaultTemplate,
  'modern_clean': renderModernCleanTemplate,
  'classic_tax_invoice': renderClassicTaxTemplate,
};

/**
 * Get the appropriate template renderer based on template key
 * Falls back to default_existing if key is null or not found
 */
export function getTemplateRenderer(templateKey: string | null | undefined): TemplateRenderer {
  const key = templateKey || 'default_existing';
  return templateRenderers[key] || templateRenderers['default_existing'];
}

/**
 * Render invoice PDF using the specified template
 */
export async function renderInvoicePDF(data: InvoiceData, templateKey?: string | null): Promise<Blob> {
  const renderer = getTemplateRenderer(templateKey);
  return await renderer(data);
}

/**
 * Get template config by key
 */
export function getTemplateConfig(templateKey: string | null | undefined): TemplateConfig {
  const key = templateKey || 'default_existing';
  return INVOICE_TEMPLATES.find(t => t.key === key) || INVOICE_TEMPLATES[0];
}
