// Re-export types and registry for easy imports
export { renderReceiptPDF, getReceiptTemplateRenderer, getReceiptTemplateConfig, RECEIPT_TEMPLATES } from './templates/registry';
export type { ReceiptData, ReceiptTemplateConfig, ReceiptTemplateRenderer } from './templates/types';
