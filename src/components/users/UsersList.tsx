import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Mail, Shield, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import EditUserDialog from "./EditUserDialog";
import PasswordResetDialog from "./PasswordResetDialog";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  roles: string[];
  created_at: string;
  last_sign_in?: string;
}

interface UsersListProps {
  users: User[];
  loading: boolean;
  onRefresh: () => void;
}

export function UsersList({ users, loading, onRefresh }: UsersListProps) {
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      sales: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
      operations: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      finance: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
      user: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
    };
    return colors[role] || colors.user;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.username}</p>
                      <div className="flex gap-1">
                        {user.roles.map(role => (
                          <Badge key={role} className={getRoleBadgeColor(role)}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.last_sign_in && (
                      <p className="text-xs text-muted-foreground">
                        Last login: {format(new Date(user.last_sign_in), 'PPp')}
                      </p>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditUser(user)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setResetPasswordUser(user)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Invite
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {editUser && (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          onSuccess={onRefresh}
        />
      )}

      {resetPasswordUser && (
        <PasswordResetDialog
          userId={resetPasswordUser.id}
          userEmail={resetPasswordUser.email}
          username={resetPasswordUser.username}
          open={!!resetPasswordUser}
          onOpenChange={(open) => !open && setResetPasswordUser(null)}
        />
      )}
    </>
  );
}
