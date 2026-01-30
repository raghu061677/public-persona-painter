// Receipt PDF Template Registry
import { ReceiptTemplateConfig, ReceiptTemplateRenderer, ReceiptData } from './types';
import { renderReceiptDefaultTemplate } from './defaultTemplate';
import { renderReceiptModernTemplate } from './modernTemplate';

// Re-export types for external use
export type { ReceiptData, ReceiptTemplateConfig, ReceiptTemplateRenderer } from './types';

// Template configurations
export const RECEIPT_TEMPLATES: ReceiptTemplateConfig[] = [
  {
    key: 'receipt_default',
    name: 'Default Receipt',
    description: 'Professional receipt with detailed breakdown',
  },
  {
    key: 'receipt_modern',
    name: 'Modern Receipt',
    description: 'Clean minimalist design with emphasis on amount',
  },
];

// Template renderer map
const templateRenderers: Record<string, ReceiptTemplateRenderer> = {
  'receipt_default': renderReceiptDefaultTemplate,
  'receipt_modern': renderReceiptModernTemplate,
};

/**
 * Get the appropriate template renderer based on template key
 * Falls back to receipt_default if key is null or not found
 */
export function getReceiptTemplateRenderer(templateKey: string | null | undefined): ReceiptTemplateRenderer {
  const key = templateKey || 'receipt_default';
  return templateRenderers[key] || templateRenderers['receipt_default'];
}

/**
 * Render receipt PDF using the specified template
 */
export async function renderReceiptPDF(data: ReceiptData, templateKey?: string | null): Promise<Blob> {
  const renderer = getReceiptTemplateRenderer(templateKey);
  return await renderer(data);
}

/**
 * Get template config by key
 */
export function getReceiptTemplateConfig(templateKey: string | null | undefined): ReceiptTemplateConfig {
  const key = templateKey || 'receipt_default';
  return RECEIPT_TEMPLATES.find(t => t.key === key) || RECEIPT_TEMPLATES[0];
}
