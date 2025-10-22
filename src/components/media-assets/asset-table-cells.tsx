import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Edit, Copy, Trash2, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Asset {
  id: string;
  image_urls?: string[];
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
  const assetId = row.original.id;

  return (
    <div className="flex items-center justify-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/admin/media-assets/${assetId}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/admin/media-assets/edit/${assetId}`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/admin/media-assets/new?duplicate=${assetId}`)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete(assetId)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
