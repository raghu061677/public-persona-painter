import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  legal_name: z.string().optional(),
  type: z.enum(["media_owner", "agency"]),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  is_primary: boolean;
}

interface CreateCompanyWithUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCompanyWithUsersDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCompanyWithUsersDialogProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "",
      email: "",
      password: "",
      role: "admin",
      is_primary: true,
    },
  ]);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      type: "media_owner",
    },
  });

  const companyType = watch("type");

  const addUser = () => {
    setUsers([
      ...users,
      {
        id: Date.now().toString(),
        name: "",
        email: "",
        password: "",
        role: "user",
        is_primary: false,
      },
    ]);
  };

  const removeUser = (id: string) => {
    if (users.length > 1) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  const updateUser = (id: string, field: keyof User, value: any) => {
    setUsers(
      users.map((u) => (u.id === id ? { ...u, [field]: value } : u))
    );
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setLoading(true);

      // Validate users
      const validUsers = users.filter((u) => u.name && u.email && u.password);
      if (validUsers.length === 0) {
        toast({
          title: "Error",
          description: "At least one user with complete details is required",
          variant: "destructive",
        });
        return;
      }

      // Call edge function to create company with users
      const { data: result, error } = await supabase.functions.invoke(
        "create-company-with-users",
        {
          body: {
            companyData: data,
            users: validUsers,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Company created with ${result.users.length} user(s)`,
      });

      reset();
      setUsers([
        {
          id: "1",
          name: "",
          email: "",
          password: "",
          role: "admin",
          is_primary: true,
        },
      ]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Create company error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create company",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Company with Users</DialogTitle>
          <DialogDescription>
            Create a new company and set up default users with roles
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input id="name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal_name">Legal Name</Label>
                <Input id="legal_name" {...register("legal_name")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Company Type *</Label>
                <Select
                  value={companyType}
                  onValueChange={(value) => setValue("type", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="media_owner">Media Owner</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input id="gstin" {...register("gstin")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input id="pan" {...register("pan")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input id="address_line1" {...register("address_line1")} />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input id="address_line2" {...register("address_line2")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register("city")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register("state")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" {...register("pincode")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" {...register("website")} />
                {errors.website && (
                  <p className="text-sm text-destructive">{errors.website.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Users Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Default Users</h3>
              <Button type="button" variant="outline" size="sm" onClick={addUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>

            {users.map((user, index) => (
              <div key={user.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">User {index + 1}</h4>
                  {users.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={user.name}
                      onChange={(e) => updateUser(user.id, "name", e.target.value)}
                      placeholder="Full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={user.email}
                      onChange={(e) => updateUser(user.id, "email", e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={user.password}
                      onChange={(e) => updateUser(user.id, "password", e.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select
                      value={user.role}
                      onValueChange={(value) => updateUser(user.id, "role", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox
                      id={`primary-${user.id}`}
                      checked={user.is_primary}
                      onCheckedChange={(checked) =>
                        updateUser(user.id, "is_primary", checked)
                      }
                    />
                    <Label htmlFor={`primary-${user.id}`} className="cursor-pointer">
                      Set as primary admin
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Company & Users
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
