import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeButton } from "./QRCodeButton";

interface Asset {
  id: string;
  media_asset_code?: string;
  primary_photo_url?: string;
  latitude?: number;
  longitude?: number;
  google_street_view_url?: string;
  [key: string]: any;
}

export function ImageCell({ row }: any) {
  const navigate = useNavigate();
  const asset = row.original;
  const displayCode = asset.media_asset_code || asset.asset_code || asset.id;
  
  const imageUrl = asset.primary_photo_url || "/placeholder.svg";

  return (
    <img
      src={imageUrl}
      alt={displayCode}
      className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => navigate(`/admin/media-assets/${displayCode}`)}
      title="Click to view details"
    />
  );
}

export function ActionCell({ 
  row, 
  onDelete,
  onQRGenerated 
}: any) {
  const navigate = useNavigate();
  const asset = row.original;
  const assetId = asset.id;
  const displayCode = asset.media_asset_code || asset.asset_code || asset.id;
  const hasLocation = asset.latitude && asset.longitude;

  const openStreetView = () => {
    if (asset.google_street_view_url) {
      window.open(asset.google_street_view_url, '_blank');
    } else if (hasLocation) {
      const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${asset.latitude},${asset.longitude}`;
      window.open(streetViewUrl, '_blank');
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigate(`/admin/media-assets/${displayCode}`)}
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigate(`/admin/media-assets/edit/${displayCode}`)}
        title="Edit"
      >
        <Edit className="h-4 w-4" />
      </Button>
      
      {hasLocation && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={openStreetView}
          title="Street View"
        >
          <MapPin className="h-4 w-4" />
        </Button>
      )}
      
      <QRCodeButton
        assetId={assetId}
        latitude={asset.latitude}
        longitude={asset.longitude}
        googleStreetViewUrl={asset.google_street_view_url}
        locationUrl={asset.location_url}
        qrCodeUrl={asset.qr_code_url}
        onQRGenerated={onQRGenerated}
        size="icon"
        variant="ghost"
      />
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => onDelete(assetId)}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
