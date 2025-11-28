import { MapPin, Ruler, IndianRupee, Receipt, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/mediaAssets";
import { SectionCard } from "@/components/ui/section-card";
import { StreetViewPreview } from "./StreetViewPreview";

interface AssetOverviewTabProps {
  asset: any;
}

export function AssetOverviewTab({ asset }: AssetOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Street View Preview - Full Width */}
      {asset.latitude && asset.longitude && (
        <div className="w-full">
          <StreetViewPreview
            latitude={asset.latitude}
            longitude={asset.longitude}
            streetViewUrl={asset.google_street_view_url}
            showPreview={true}
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Location Card */}
      <SectionCard 
        title="Location" 
        icon={MapPin} 
        variant="primary"
        description="Physical location and address details"
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-medium">{asset.location}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Area</p>
              <p className="font-medium">{asset.area}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">City</p>
              <p className="font-medium">{asset.city}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">District</p>
              <p className="font-medium">{asset.district || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">State</p>
              <p className="font-medium">{asset.state || 'N/A'}</p>
            </div>
          </div>
          {asset.direction && (
            <div>
              <p className="text-sm text-muted-foreground">Direction</p>
              <p className="font-medium">{asset.direction}</p>
            </div>
          )}
          {asset.latitude && asset.longitude && (
            <div>
              <p className="text-sm text-muted-foreground">Coordinates</p>
              <p className="font-medium">
                {asset.latitude}, {asset.longitude}
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Specifications Card */}
      <SectionCard 
        title="Specifications" 
        icon={Ruler} 
        variant="blue"
        description="Media type, dimensions and technical details"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Media Type</p>
              <p className="font-medium">{asset.media_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Size/Dimension</p>
              <p className="font-medium">{asset.dimensions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lighting Type</p>
              <p className="font-medium">{asset.illumination || 'Non-lit'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{asset.category}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Area</p>
              <p className="font-medium">{asset.total_sqft} sq ft</p>
            </div>
            {asset.media_id && (
              <div>
                <p className="text-sm text-muted-foreground">Media ID</p>
                <p className="font-medium">{asset.media_id}</p>
              </div>
            )}
          </div>
          {asset.is_multi_face && (
            <div className="mt-4">
              <Badge variant="secondary">Multi-Face</Badge>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Pricing Card */}
      <SectionCard 
        title="Pricing" 
        icon={IndianRupee} 
        variant="green"
        description="Rate card and pricing structure"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Card Rate</p>
              <p className="font-medium text-lg">{formatCurrency(asset.card_rate)}/month</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Base Rent</p>
              <p className="font-medium">{formatCurrency(asset.base_rent)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">GST</p>
              <p className="font-medium">{asset.gst_percent}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Base Margin</p>
              <p className="font-medium">{asset.base_margin || 0}%</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Additional Costs Card */}
      <SectionCard 
        title="Additional Costs" 
        icon={Receipt} 
        variant="amber"
        description="Printing, mounting and other charges"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Printing</p>
              <p className="font-medium">{formatCurrency(asset.printing_charges)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mounting</p>
              <p className="font-medium">{formatCurrency(asset.mounting_charges)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Concession Fee</p>
              <p className="font-medium">{formatCurrency(asset.concession_fee)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ad Tax</p>
              <p className="font-medium">{formatCurrency(asset.ad_tax)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Electricity</p>
              <p className="font-medium">{formatCurrency(asset.electricity)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Maintenance</p>
              <p className="font-medium">{formatCurrency(asset.maintenance)}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Ownership Card */}
      <SectionCard 
        title="Ownership" 
        icon={Building2} 
        variant="purple"
        description="Ownership type and vendor information"
        className="lg:col-span-2"
      >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{asset.ownership}</p>
            </div>
            {asset.ownership === 'own' && asset.municipal_authority && (
              <div>
                <p className="text-sm text-muted-foreground">Municipal Authority</p>
                <p className="font-medium">{asset.municipal_authority}</p>
              </div>
            )}
            {asset.vendor_details && Object.keys(asset.vendor_details).length > 0 && (
              <>
                {asset.vendor_details.name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor Name</p>
                    <p className="font-medium">{asset.vendor_details.name}</p>
                  </div>
                )}
                {asset.vendor_details.contact && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor Contact</p>
                    <p className="font-medium">{asset.vendor_details.contact}</p>
                  </div>
                )}
              </>
            )}
          </div>
      </SectionCard>
      </div>
    </div>
  );
}
