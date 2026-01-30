import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2, 
  Send, 
  CheckCircle, 
  XCircle,
  CreditCard,
  ExternalLink,
  FileText
} from "lucide-react";
import { formatINR } from "@/utils/finance";
import { format } from "date-fns";
import type { Expense } from "@/types/expenses";
import { cn } from "@/lib/utils";

interface ExpensesTableProps {
  expenses: Expense[];
  loading: boolean;
  onView: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => Promise<boolean>;
  onStatusChange: (id: string, status: string, remarks?: string) => Promise<boolean>;
  userRole: string;
}

const getApprovalStatusBadge = (status: string) => {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
    Draft: { variant: "secondary", className: "bg-slate-100 text-slate-700" },
    Submitted: { variant: "default", className: "bg-blue-100 text-blue-700" },
    Approved: { variant: "default", className: "bg-green-100 text-green-700" },
    Rejected: { variant: "destructive", className: "bg-red-100 text-red-700" },
    Paid: { variant: "default", className: "bg-emerald-100 text-emerald-700" },
  };
  return variants[status] || variants.Draft;
};

const getPaymentStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    Paid: "bg-green-100 text-green-700",
    "Partially Paid": "bg-amber-100 text-amber-700",
    Unpaid: "bg-red-100 text-red-700",
    Pending: "bg-amber-100 text-amber-700",
  };
  return variants[status] || "bg-gray-100 text-gray-700";
};

const allocationColors: Record<string, string> = {
  Campaign: "bg-purple-100 text-purple-700",
  Plan: "bg-blue-100 text-blue-700",
  Asset: "bg-cyan-100 text-cyan-700",
};

export function ExpensesTable({
  expenses,
  loading,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  userRole,
}: ExpensesTableProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = userRole === 'admin';
  const isFinance = userRole === 'finance' || isAdmin;
  const canApprove = isAdmin || userRole === 'finance';

  const handleDeleteClick = (id: string) => {
    setExpenseToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    await onDelete(expenseToDelete);
    setDeleting(false);
    setDeleteDialogOpen(false);
    setExpenseToDelete(null);
  };

  const getAllocationBadge = (expense: Expense) => {
    if (expense.allocation_type === 'General') return null;
    
    const allocationType = expense.allocation_type as string;
    const colorClass = allocationColors[allocationType] || "bg-gray-100 text-gray-700";

    let label = allocationType;
    if (expense.campaigns?.campaign_name) {
      label = expense.campaigns.campaign_name;
    } else if (expense.plans?.name) {
      label = expense.plans.name;
    } else if (expense.media_assets?.media_asset_code) {
      label = expense.media_assets.media_asset_code;
    }

    return (
      <Badge variant="outline" className={cn("text-xs", colorClass)}>
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border">
        <div className="p-8 text-center text-muted-foreground">
          Loading expenses...
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-card rounded-lg border">
        <div className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No expenses found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or add a new expense
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Expense No</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Vendor</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Allocation</TableHead>
              <TableHead className="font-semibold">Invoice No</TableHead>
              <TableHead className="font-semibold text-right">Amount</TableHead>
              <TableHead className="font-semibold">Payment</TableHead>
              <TableHead className="font-semibold">Approval</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id} className="hover:bg-muted/30">
                <TableCell>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto font-mono text-sm"
                    onClick={() => onView(expense)}
                  >
                    {expense.expense_no || expense.id}
                  </Button>
                </TableCell>
                <TableCell className="text-sm">
                  {expense.expense_date 
                    ? format(new Date(expense.expense_date), "dd MMM yyyy")
                    : format(new Date(expense.created_at), "dd MMM yyyy")}
                </TableCell>
                <TableCell className="font-medium max-w-[150px] truncate">
                  {expense.vendor_name}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      backgroundColor: expense.expense_categories?.color ? `${expense.expense_categories.color}20` : undefined,
                      color: expense.expense_categories?.color,
                      borderColor: expense.expense_categories?.color,
                    }}
                  >
                    {expense.expense_categories?.name || expense.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getAllocationBadge(expense)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {expense.invoice_no || "-"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatINR(expense.total_amount)}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", getPaymentStatusBadge(expense.payment_status))}
                  >
                    {expense.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={getApprovalStatusBadge(expense.approval_status).variant}
                    className={cn("text-xs", getApprovalStatusBadge(expense.approval_status).className)}
                  >
                    {expense.approval_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(expense)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      
                      {expense.approval_status === 'Draft' && (
                        <DropdownMenuItem onClick={() => onEdit(expense)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {/* Workflow Actions */}
                      {expense.approval_status === 'Draft' && (
                        <DropdownMenuItem onClick={() => onStatusChange(expense.id, 'Submitted')}>
                          <Send className="mr-2 h-4 w-4" />
                          Submit for Approval
                        </DropdownMenuItem>
                      )}

                      {expense.approval_status === 'Submitted' && canApprove && (
                        <>
                          <DropdownMenuItem onClick={() => onStatusChange(expense.id, 'Approved')}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStatusChange(expense.id, 'Rejected', 'Rejected by approver')}>
                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      )}

                      {expense.approval_status === 'Approved' && isFinance && (
                        <DropdownMenuItem onClick={() => onStatusChange(expense.id, 'Paid')}>
                          <CreditCard className="mr-2 h-4 w-4 text-emerald-600" />
                          Mark as Paid
                        </DropdownMenuItem>
                      )}

                      {expense.invoice_url && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => window.open(expense.invoice_url!, '_blank')}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Invoice
                          </DropdownMenuItem>
                        </>
                      )}

                      {expense.approval_status === 'Draft' && isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(expense.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
