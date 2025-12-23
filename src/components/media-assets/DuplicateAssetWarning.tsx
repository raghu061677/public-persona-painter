import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface DuplicateAsset {
  id: string;
  media_asset_code: string | null;
  location: string;
  created_at: string;
}

interface DuplicateAssetWarningProps {
  duplicates: DuplicateAsset[];
  onDismiss?: () => void;
}

export function DuplicateAssetWarning({ duplicates, onDismiss }: DuplicateAssetWarningProps) {
  if (duplicates.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">
        Possible Duplicate Detected!
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm mb-3">
          An asset with the same location details already exists. Please verify before saving:
        </p>
        <ul className="space-y-2">
          {duplicates.map((dup) => (
            <li key={dup.id} className="flex items-center justify-between bg-amber-100 dark:bg-amber-900 rounded p-2">
              <div className="text-sm">
                <span className="font-medium">{dup.media_asset_code || dup.id}</span>
                <span className="mx-2">•</span>
                <span>{dup.location}</span>
                <span className="mx-2">•</span>
                <span className="text-muted-foreground">
                  Created {format(new Date(dup.created_at), 'dd MMM yyyy')}
                </span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/admin/media-assets/${dup.id}`} target="_blank">
                  View
                </Link>
              </Button>
            </li>
          ))}
        </ul>
        {onDismiss && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDismiss}
            className="mt-3 text-amber-700 hover:text-amber-800"
          >
            Dismiss Warning
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
