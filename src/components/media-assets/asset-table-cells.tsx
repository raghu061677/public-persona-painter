import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Asset {
  id: string;
  image_urls?: string[];
  latitude?: number;
  longitude?: number;
  google_street_view_url?: string;
  [key: string]: any;
}

export function ImageCell({ row }: any) {
  const imageUrls = row.original.image_urls;
  const imageUrl = imageUrls && imageUrls.length > 0 ? imageUrls[0] : null;

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
      alt={row.original.id}
      className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => window.open(imageUrl, '_blank')}
    />
  );
}

export function ActionCell({ 
  row, 
  onDelete 
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
