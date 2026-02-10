import { useCallback } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useListView } from "./useListView";
import { exportListExcel } from "@/utils/exports/excel/exportListExcel";
import { exportListPdf } from "@/utils/exports/pdf/exportListPdf";
import type { RowStyleRule } from "@/utils/exports/excel/exportListExcel";
import type { PdfRowStyleRule } from "@/utils/exports/pdf/exportListPdf";
import type { FieldCatalogEntry } from "./useFieldCatalog";
import { useToast } from "@/hooks/use-toast";

interface UseListViewExportOptions {
  pageKey: string;
  title: string;
  subtitle?: string;
  excelRules?: RowStyleRule[];
  pdfRules?: PdfRowStyleRule[];
  orientation?: "p" | "l";
  /** Override value extractors per field key */
  valueOverrides?: Record<string, (row: any, index: number) => any>;
}

export function useListViewExport(options: UseListViewExportOptions) {
  const { company } = useCompany();
  const lv = useListView(options.pageKey);
  const { toast } = useToast();

  /** Resolve ordered field keys: prefer field_order from active preset, fallback to selectedFields */
  const resolveFieldKeys = useCallback(
    (fieldKeys?: string[]) => {
      if (fieldKeys && fieldKeys.length > 0) return fieldKeys;
      const presetOrder = lv.activePreset?.field_order;
      if (presetOrder && presetOrder.length > 0) return presetOrder;
      return lv.selectedFields;
    },
    [lv.selectedFields, lv.activePreset]
  );

  const buildExcelFields = useCallback(
    (fieldKeys: string[]) => {
      return fieldKeys
        .map((key) => {
          const entry = lv.catalog.fields.find((f: FieldCatalogEntry) => f.field_key === key);
          if (!entry) return null;
          return {
            key: entry.field_key,
            label: entry.label,
            width: entry.width ?? undefined,
            type: entry.data_type as any,
            value: options.valueOverrides?.[key],
          };
        })
        .filter(Boolean) as any[];
    },
    [lv.catalog.fields, options.valueOverrides]
  );

  const buildPdfFields = useCallback(
    (fieldKeys: string[]) => {
      return fieldKeys
        .map((key) => {
          const entry = lv.catalog.fields.find((f: FieldCatalogEntry) => f.field_key === key);
          if (!entry) return null;
          return {
            key: entry.field_key,
            label: entry.label,
            width: entry.width ?? undefined,
            value: options.valueOverrides?.[key],
          };
        })
        .filter(Boolean) as any[];
    },
    [lv.catalog.fields, options.valueOverrides]
  );

  const handleExportExcel = useCallback(
    async (rows: any[], fieldKeys?: string[]) => {
      const keys = resolveFieldKeys(fieldKeys);
      if (!rows || rows.length === 0) {
        toast({ title: "No Data", description: "No rows to export." });
        return;
      }
      if (process.env.NODE_ENV === "development") {
        console.info(`[ListViewExport] Excel export: ${rows.length} rows, ${keys.length} fields`);
      }
      try {
        await exportListExcel({
          branding: {
            companyName: company?.name || "GO-ADS 360°",
            title: options.title,
            subtitle: options.subtitle,
            logoUrl: company?.logo_url || undefined,
          },
          fields: buildExcelFields(keys),
          rows,
          rowStyleRules: options.excelRules,
          fileName: `${options.title.replace(/\s+/g, "_")}_export.xlsx`,
        });
        toast({ title: "Export Complete", description: "Excel downloaded" });
      } catch (err) {
        console.error("Excel export error:", err);
        toast({ title: "Export Failed", variant: "destructive" });
      }
    },
    [resolveFieldKeys, company, options, buildExcelFields, toast]
  );

  const handleExportPdf = useCallback(
    async (rows: any[], fieldKeys?: string[]) => {
      const keys = resolveFieldKeys(fieldKeys);
      if (!rows || rows.length === 0) {
        toast({ title: "No Data", description: "No rows to export." });
        return;
      }
      if (process.env.NODE_ENV === "development") {
        console.info(`[ListViewExport] PDF export: ${rows.length} rows, ${keys.length} fields`);
      }
      try {
        await exportListPdf({
          branding: {
            companyName: company?.name || "GO-ADS 360°",
            title: options.title,
            subtitle: options.subtitle,
            themeColor: company?.theme_color || undefined,
            logoUrl: company?.logo_url || undefined,
          },
          fields: buildPdfFields(keys),
          rows,
          orientation: options.orientation ?? "l",
          rowStyleRules: options.pdfRules,
          fileName: `${options.title.replace(/\s+/g, "_")}_export.pdf`,
        });
        toast({ title: "Export Complete", description: "PDF downloaded" });
      } catch (err) {
        console.error("PDF export error:", err);
        toast({ title: "Export Failed", variant: "destructive" });
      }
    },
    [resolveFieldKeys, company, options, buildPdfFields, toast]
  );

  return {
    lv,
    handleExportExcel,
    handleExportPdf,
    company,
  };
}
