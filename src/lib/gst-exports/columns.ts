// Column definitions for GST exports — maps view fields to human-readable headers

export interface ColDef {
  key: string;
  header: string;
  type: "text" | "number" | "date" | "currency";
  width?: number;
}

export const B2B_COLUMNS: ColDef[] = [
  { key: "invoice_no", header: "Invoice No", type: "text", width: 20 },
  { key: "invoice_date", header: "Invoice Date", type: "date", width: 14 },
  { key: "client_name", header: "Client Name", type: "text", width: 30 },
  { key: "gstin", header: "GSTIN", type: "text", width: 18 },
  { key: "place_of_supply", header: "Place of Supply", type: "text", width: 22 },
  { key: "place_of_supply_state_code", header: "State Code", type: "text", width: 12 },
  { key: "supply_nature", header: "Supply Nature", type: "text", width: 14 },
  { key: "reverse_charge_applicable", header: "Reverse Charge", type: "text", width: 14 },
  { key: "taxable_value", header: "Taxable Value", type: "currency", width: 16 },
  { key: "cgst_amount", header: "CGST", type: "currency", width: 14 },
  { key: "sgst_amount", header: "SGST", type: "currency", width: 14 },
  { key: "igst_amount", header: "IGST", type: "currency", width: 14 },
  { key: "cess_amount", header: "Cess", type: "currency", width: 12 },
  { key: "total_invoice_value", header: "Total Invoice Value", type: "currency", width: 18 },
  { key: "invoice_status", header: "Status", type: "text", width: 12 },
];

export const B2C_COLUMNS: ColDef[] = [
  { key: "invoice_no", header: "Invoice No", type: "text", width: 20 },
  { key: "invoice_date", header: "Invoice Date", type: "date", width: 14 },
  { key: "client_name", header: "Client Name", type: "text", width: 30 },
  { key: "place_of_supply", header: "Place of Supply", type: "text", width: 22 },
  { key: "place_of_supply_state_code", header: "State Code", type: "text", width: 12 },
  { key: "supply_nature", header: "Supply Nature", type: "text", width: 14 },
  { key: "taxable_value", header: "Taxable Value", type: "currency", width: 16 },
  { key: "cgst_amount", header: "CGST", type: "currency", width: 14 },
  { key: "sgst_amount", header: "SGST", type: "currency", width: 14 },
  { key: "igst_amount", header: "IGST", type: "currency", width: 14 },
  { key: "total_invoice_value", header: "Total Invoice Value", type: "currency", width: 18 },
  { key: "invoice_status", header: "Status", type: "text", width: 12 },
];

export const CREDIT_NOTE_COLUMNS: ColDef[] = [
  { key: "document_no", header: "Credit Note No", type: "text", width: 22 },
  { key: "document_date", header: "Issue Date", type: "date", width: 14 },
  { key: "original_invoice_no", header: "Original Invoice No", type: "text", width: 22 },
  { key: "client_name", header: "Client Name", type: "text", width: 30 },
  { key: "gstin", header: "GSTIN", type: "text", width: 18 },
  { key: "place_of_supply", header: "Place of Supply", type: "text", width: 22 },
  { key: "supply_nature", header: "Supply Nature", type: "text", width: 14 },
  { key: "reason", header: "Reason", type: "text", width: 20 },
  { key: "taxable_adjustment", header: "Taxable Adjustment", type: "currency", width: 18 },
  { key: "cgst_adjustment", header: "CGST Adjustment", type: "currency", width: 16 },
  { key: "sgst_adjustment", header: "SGST Adjustment", type: "currency", width: 16 },
  { key: "igst_adjustment", header: "IGST Adjustment", type: "currency", width: 16 },
  { key: "total_adjustment_value", header: "Total Adjustment", type: "currency", width: 18 },
  { key: "status", header: "Status", type: "text", width: 12 },
];

export const HSN_COLUMNS: ColDef[] = [
  { key: "hsn_sac_code", header: "HSN/SAC Code", type: "text", width: 16 },
  { key: "hsn_sac_type", header: "Type", type: "text", width: 8 },
  { key: "item_description", header: "Description", type: "text", width: 30 },
  { key: "total_quantity", header: "Quantity", type: "number", width: 12 },
  { key: "taxable_value", header: "Taxable Value", type: "currency", width: 16 },
  { key: "cgst_amount", header: "CGST", type: "currency", width: 14 },
  { key: "sgst_amount", header: "SGST", type: "currency", width: 14 },
  { key: "igst_amount", header: "IGST", type: "currency", width: 14 },
  { key: "total_value", header: "Total Value", type: "currency", width: 16 },
  { key: "invoice_count", header: "Invoice Count", type: "number", width: 14 },
];

export const STATEWISE_COLUMNS: ColDef[] = [
  { key: "place_of_supply_state_code", header: "State Code", type: "text", width: 12 },
  { key: "place_of_supply", header: "Place of Supply", type: "text", width: 24 },
  { key: "b2b_taxable_value", header: "B2B Taxable Value", type: "currency", width: 18 },
  { key: "b2c_taxable_value", header: "B2C Taxable Value", type: "currency", width: 18 },
  { key: "total_taxable_value", header: "Total Taxable Value", type: "currency", width: 18 },
  { key: "cgst_amount", header: "CGST", type: "currency", width: 14 },
  { key: "sgst_amount", header: "SGST", type: "currency", width: 14 },
  { key: "igst_amount", header: "IGST", type: "currency", width: 14 },
  { key: "total_invoice_value", header: "Total Invoice Value", type: "currency", width: 18 },
  { key: "invoice_count", header: "Invoice Count", type: "number", width: 14 },
];

export const VALIDATION_COLUMNS: ColDef[] = [
  { key: "severity", header: "Severity", type: "text", width: 12 },
  { key: "issue_code", header: "Issue Code", type: "text", width: 24 },
  { key: "issue_message", header: "Issue Message", type: "text", width: 40 },
  { key: "source_table", header: "Source Table", type: "text", width: 16 },
  { key: "source_document_no", header: "Document No", type: "text", width: 22 },
  { key: "suggested_fix", header: "Suggested Fix", type: "text", width: 40 },
];

export const INVOICE_REGISTER_COLUMNS: ColDef[] = [
  { key: "document_no", header: "Document No", type: "text", width: 22 },
  { key: "document_kind", header: "Document Type", type: "text", width: 14 },
  { key: "document_date", header: "Date", type: "date", width: 14 },
  { key: "original_invoice_no", header: "Original Invoice No", type: "text", width: 22 },
  { key: "client_name", header: "Client Name", type: "text", width: 30 },
  { key: "gstin", header: "GSTIN", type: "text", width: 18 },
  { key: "place_of_supply", header: "Place of Supply", type: "text", width: 22 },
  { key: "place_of_supply_state_code", header: "State Code", type: "text", width: 12 },
  { key: "party_type", header: "Party Type", type: "text", width: 10 },
  { key: "supply_nature", header: "Supply Nature", type: "text", width: 14 },
  { key: "reverse_charge_applicable", header: "Reverse Charge", type: "text", width: 14 },
  { key: "taxable_value", header: "Taxable Value", type: "currency", width: 16 },
  { key: "cgst_amount", header: "CGST", type: "currency", width: 14 },
  { key: "sgst_amount", header: "SGST", type: "currency", width: 14 },
  { key: "igst_amount", header: "IGST", type: "currency", width: 14 },
  { key: "cess_amount", header: "Cess", type: "currency", width: 12 },
  { key: "round_off_amount", header: "Round Off", type: "currency", width: 12 },
  { key: "total_document_value", header: "Total Value", type: "currency", width: 18 },
  { key: "status", header: "Status", type: "text", width: 12 },
];
