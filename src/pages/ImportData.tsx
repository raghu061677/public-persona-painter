import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Users } from "lucide-react";

export default function ImportData() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
          <p className="text-muted-foreground mt-1">
            Bulk import data from CSV or Excel files.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Media Assets
            </CardTitle>
            <CardDescription>
              Upload a list of media assets. The system will auto-generate IDs in format CITY-MEDIATYPE-XXXX.
              Required fields: city, mediaType, location, area.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/admin/media-assets/import')}
              className="w-full"
            >
              Go to Media Assets Import
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Import Clients
            </CardTitle>
            <CardDescription>
              Upload a list of clients. The system will auto-generate IDs in format STATE-XXXX.
              Required fields: name, state.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/admin/clients/import')}
              className="w-full"
            >
              Go to Clients Import
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
