/** INR currency formatter for GST reports */
export const fmtINR = (n: number | null | undefined): string => {
  const val = n ?? 0;
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmtINRCompact = (n: number | null | undefined): string => {
  const val = n ?? 0;
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(1)} K`;
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function filingPeriodLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}
