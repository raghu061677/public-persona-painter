import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Image as ImageIcon } from "lucide-react";

interface ProofGalleryProps {
  assets: any[];
}

export function ProofGallery({ assets }: ProofGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);
  
  const photoTypes = [
    { key: 'newspaperPhoto', label: 'Newspaper' },
    { key: 'geoTaggedPhoto', label: 'Geo-Tagged' },
    { key: 'trafficPhoto1', label: 'Traffic View 1' },
    { key: 'trafficPhoto2', label: 'Traffic View 2' },
  ];

  const assetsWithPhotos = assets.filter(asset => 
    asset.photos && Object.keys(asset.photos).length > 0
  );

  if (assetsWithPhotos.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">No proof photos uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {assetsWithPhotos.map((asset) => {
        const photos = asset.photos || {};
        const uploadedCount = photoTypes.filter(pt => photos[pt.key]?.url).length;
        const isComplete = uploadedCount === 4;

        return (
          <Card key={asset.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{asset.asset_id}</h3>
                  <p className="text-sm text-muted-foreground">{asset.location}, {asset.city}</p>
                </div>
                <Badge variant={isComplete ? "default" : "secondary"} className="gap-1">
                  {isComplete ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {uploadedCount}/4 Photos
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photoTypes.map((photoType) => {
                  const photo = photos[photoType.key];
                  
                  return (
                    <div key={photoType.key} className="space-y-2">
                      <p className="text-sm font-medium">{photoType.label}</p>
                      {photo?.url ? (
                        <div
                          className="relative aspect-square rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors"
                          onClick={() => setSelectedPhoto(photo.url)}
                        >
                          <img
                            src={photo.url}
                            alt={photoType.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Full size"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
