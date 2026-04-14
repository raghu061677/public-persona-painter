/**
 * Phase 4B: Displays registration snapshot context on the invoice detail page.
 * Shows label, GSTIN, state, and formatted addresses when registration snapshot exists.
 * Falls back gracefully when absent (renders nothing).
 */
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  invoice: Record<string, any>;
}

function formatAddressFromSnapshot(snapshot: any): string {
  if (!snapshot) return "";
  if (typeof snapshot === "string") return snapshot;
  if (typeof snapshot === "object") {
    const parts = [
      snapshot.line1,
      snapshot.line2,
      snapshot.city,
      snapshot.district,
      snapshot.state,
      snapshot.pincode,
      snapshot.country,
    ].filter(Boolean);
    return parts.join(", ");
  }
  return "";
}

export function InvoiceRegistrationInfo({ invoice }: Props) {
  const hasRegistration = !!(
    invoice.registration_label_snapshot ||
    invoice.registration_gstin_snapshot ||
    invoice.registration_state_snapshot
  );

  if (!hasRegistration) return null;

  const billingAddr = formatAddressFromSnapshot(invoice.registration_billing_address_snapshot);
  const shippingAddr = formatAddressFromSnapshot(invoice.registration_shipping_address_snapshot);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Billing / GST Registration</span>
        <Badge variant="outline" className="text-xs">
          {invoice.registration_label_snapshot || "Registration"}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground pl-6">
        {invoice.registration_gstin_snapshot && (
          <div>
            <span className="font-medium text-foreground">GSTIN:</span>{" "}
            {invoice.registration_gstin_snapshot}
          </div>
        )}
        {invoice.registration_state_snapshot && (
          <div>
            <span className="font-medium text-foreground">State:</span>{" "}
            {invoice.registration_state_snapshot}
            {invoice.registration_state_code_snapshot && (
              <span className="ml-1">({invoice.registration_state_code_snapshot})</span>
            )}
          </div>
        )}
        {billingAddr && (
          <div className="md:col-span-2">
            <span className="font-medium text-foreground">Billing Address:</span>{" "}
            {billingAddr}
          </div>
        )}
        {shippingAddr && shippingAddr !== billingAddr && (
          <div className="md:col-span-2">
            <span className="font-medium text-foreground">Shipping Address:</span>{" "}
            {shippingAddr}
          </div>
        )}
      </div>
    </div>
  );
}
