import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Role {
  id: string;
  role_name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
}

interface PlatformRolesTableProps {
  roles: Role[];
  loading: boolean;
  onEdit: (role: Role) => void;
  onDelete: (roleId: string) => void;
}

export function PlatformRolesTable({ roles, loading, onEdit, onDelete }: PlatformRolesTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!roles.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No roles configured yet. Create your first platform role.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id}>
            <TableCell className="font-medium">{role.role_name}</TableCell>
            <TableCell>{role.description || "—"}</TableCell>
            <TableCell>
              {role.is_system_role ? (
                <Badge variant="secondary">System</Badge>
              ) : (
                <Badge variant="outline">Custom</Badge>
              )}
            </TableCell>
            <TableCell className="text-right space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(role)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              {!role.is_system_role && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Role</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this role? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(role.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
