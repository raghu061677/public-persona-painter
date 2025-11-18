import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileCheck } from "lucide-react";

export default function PurchaseOrders() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Manage purchase orders for vendor services
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Purchase Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Purchase Orders
          </CardTitle>
          <CardDescription>
            Track POs for printing, mounting, and other services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No purchase orders yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Purchase orders for vendor services will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
