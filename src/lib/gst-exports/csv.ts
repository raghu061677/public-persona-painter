import { ColDef } from "./columns";

function formatCsvValue(val: any, type: ColDef["type"]): string {
  if (val == null || val === "") return "";
  if (type === "currency" || type === "number") {
    const n = Number(val);
    return isNaN(n) ? String(val) : String(n);
  }
  if (type === "date") {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      }
    } catch { /* fallthrough */ }
    return String(val);
  }
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function generateCsv(data: any[], columns: ColDef[]): string {
  const header = columns.map((c) => c.header).join(",");
  const rows = data.map((row) =>
    columns.map((c) => formatCsvValue(row[c.key], c.type)).join(",")
  );
  return [header, ...rows].join("\n");
}

export function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
