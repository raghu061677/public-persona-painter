import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeButton } from "./QRCodeButton";

interface Asset {
  id: string;
  image_urls?: string[];
  images?: {
    photos?: Array<{ url: string; tag: string; uploaded_at: string }>;
    [key: string]: any;
  };
  latitude?: number;
  longitude?: number;
  google_street_view_url?: string;
  [key: string]: any;
}

export function ImageCell({ row }: any) {
  const navigate = useNavigate();
  const asset = row.original;
  
  // Try to get the first image from images.photos array (new format)
  let imageUrl: string | null = null;
  
  if (asset.images?.photos && Array.isArray(asset.images.photos) && asset.images.photos.length > 0) {
    imageUrl = asset.images.photos[0].url;
  }
  
  // Fallback to legacy image_urls array if new format is empty
  if (!imageUrl && asset.image_urls && asset.image_urls.length > 0) {
    imageUrl = asset.image_urls[0];
  }

  if (!imageUrl) {
    return (
      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
        No Image
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={asset.id}
      className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => navigate(`/admin/media-assets/${asset.id}`)}
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
        onClick={() => navigate(`/admin/media-assets/${assetId}`)}
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigate(`/admin/media-assets/edit/${assetId}`)}
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
