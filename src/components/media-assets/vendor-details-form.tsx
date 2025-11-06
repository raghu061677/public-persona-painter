import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VendorDetails {
  id?: string;
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

interface VendorDetailsFormProps {
  value: VendorDetails;
  onChange: (value: VendorDetails) => void;
  onVendorSelect?: (vendorId: string) => void;
}

export function VendorDetailsForm({ value, onChange }: VendorDetailsFormProps) {
  const handleChange = (field: keyof VendorDetails, val: string) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Details</CardTitle>
        <CardDescription>Information about the vendor for rented assets</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <Label>Vendor Name</Label>
          <Input
            value={value.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Vendor company name"
          />
        </div>
        <div>
          <Label>Contact Person</Label>
          <Input
            value={value.contact || ''}
            onChange={(e) => handleChange('contact', e.target.value)}
            placeholder="Contact person name"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            value={value.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="Phone number"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={value.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="vendor@example.com"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Address</Label>
          <Input
            value={value.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Full address"
          />
        </div>
        <div>
          <Label>GST Number</Label>
          <Input
            value={value.gstNumber || ''}
            onChange={(e) => handleChange('gstNumber', e.target.value)}
            placeholder="GST registration number"
          />
        </div>
        <div>
          <Label>Bank Name</Label>
          <Input
            value={value.bankName || ''}
            onChange={(e) => handleChange('bankName', e.target.value)}
            placeholder="Bank name"
          />
        </div>
        <div>
          <Label>Account Number</Label>
          <Input
            value={value.accountNumber || ''}
            onChange={(e) => handleChange('accountNumber', e.target.value)}
            placeholder="Bank account number"
          />
        </div>
        <div>
          <Label>IFSC Code</Label>
          <Input
            value={value.ifscCode || ''}
            onChange={(e) => handleChange('ifscCode', e.target.value)}
            placeholder="IFSC code"
          />
        </div>
      </CardContent>
    </Card>
  );
}
