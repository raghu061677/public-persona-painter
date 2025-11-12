/**
 * Standardized status badge utilities for consistent color-coding across the application
 */

export interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
  icon?: string;
}

/**
 * Adds animated transition to status badge changes
 */
const animatedClassName = "transition-all duration-300 ease-in-out";

/**
 * Plan Status Colors
 */
export function getPlanStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'Draft':
      return {
        label: '🟡 Draft',
        variant: 'outline',
        className: `bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950/20 dark:text-yellow-400 ${animatedClassName}`,
        icon: '🟡'
      };
    case 'Sent':
      return {
        label: '🟠 Submitted',
        variant: 'outline',
        className: `bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 ${animatedClassName}`,
        icon: '🟠'
      };
    case 'Approved':
      return {
        label: '🟢 Approved',
        variant: 'outline',
        className: `bg-green-50 text-green-700 border-green-300 dark:bg-green-950/20 dark:text-green-400 ${animatedClassName}`,
        icon: '🟢'
      };
    case 'Rejected':
      return {
        label: '🔴 Rejected',
        variant: 'outline',
        className: `bg-red-50 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-400 ${animatedClassName}`,
        icon: '🔴'
      };
    case 'Converted':
      return {
        label: '🚀 Converted',
        variant: 'outline',
        className: `bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400 ${animatedClassName}`,
        icon: '🚀'
      };
    default:
      return {
        label: status,
        variant: 'outline',
        className: `bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-950/20 dark:text-gray-400 ${animatedClassName}`,
      };
  }
}

/**
 * Campaign Status Colors
 */
export function getCampaignStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'Planned':
      return {
        label: '📅 Planned',
        variant: 'outline',
        className: `bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400 ${animatedClassName}`,
        icon: '📅'
      };
    case 'InProgress':
      return {
        label: '🔄 In Progress',
        variant: 'outline',
        className: `bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 ${animatedClassName}`,
        icon: '🔄'
      };
    case 'Completed':
      return {
        label: '✅ Completed',
        variant: 'outline',
        className: `bg-green-50 text-green-700 border-green-300 dark:bg-green-950/20 dark:text-green-400 ${animatedClassName}`,
        icon: '✅'
      };
    case 'Cancelled':
      return {
        label: '❌ Cancelled',
        variant: 'outline',
        className: `bg-red-50 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-400 ${animatedClassName}`,
        icon: '❌'
      };
    default:
      return {
        label: status,
        variant: 'outline',
        className: `bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-950/20 dark:text-gray-400 ${animatedClassName}`,
      };
  }
}

/**
 * Media Asset Status Colors
 */
export function getAssetStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'Available':
      return {
        label: '🟢 Available',
        variant: 'outline',
        className: `bg-green-50 text-green-700 border-green-300 dark:bg-green-950/20 dark:text-green-400 ${animatedClassName}`,
        icon: '🟢'
      };
    case 'Booked':
      return {
        label: '🔵 Booked',
        variant: 'outline',
        className: `bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400 ${animatedClassName}`,
        icon: '🔵'
      };
    case 'Blocked':
      return {
        label: '🔴 Blocked',
        variant: 'outline',
        className: `bg-red-50 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-400 ${animatedClassName}`,
        icon: '🔴'
      };
    case 'Maintenance':
      return {
        label: '🟠 Maintenance',
        variant: 'outline',
        className: `bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 ${animatedClassName}`,
        icon: '🟠'
      };
    default:
      return {
        label: status,
        variant: 'outline',
        className: `bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-950/20 dark:text-gray-400 ${animatedClassName}`,
      };
  }
}

/**
 * Payment/Invoice Status Colors
 */
export function getPaymentStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'Paid':
      return {
        label: '✅ Paid',
        variant: 'outline',
        className: `bg-green-50 text-green-700 border-green-300 dark:bg-green-950/20 dark:text-green-400 ${animatedClassName}`,
        icon: '✅'
      };
    case 'Pending':
      return {
        label: '🟡 Pending',
        variant: 'outline',
        className: `bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950/20 dark:text-yellow-400 ${animatedClassName}`,
        icon: '🟡'
      };
    case 'Overdue':
      return {
        label: '🔴 Overdue',
        variant: 'outline',
        className: `bg-red-50 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-400 ${animatedClassName}`,
        icon: '🔴'
      };
    case 'PartiallyPaid':
      return {
        label: '🟠 Partially Paid',
        variant: 'outline',
        className: `bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 ${animatedClassName}`,
        icon: '🟠'
      };
    default:
      return {
        label: status,
        variant: 'outline',
        className: `bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-950/20 dark:text-gray-400 ${animatedClassName}`,
      };
  }
}

/**
 * Operations/Mounting Status Colors
 */
export function getOperationsStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'Pending':
      return {
        label: '⏳ Pending',
        variant: 'outline',
        className: `bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-950/20 dark:text-slate-400 ${animatedClassName}`,
        icon: '⏳'
      };
    case 'Assigned':
      return {
        label: '👷 Assigned',
        variant: 'outline',
        className: `bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400 ${animatedClassName}`,
        icon: '👷'
      };
    case 'Installed':
      return {
        label: '🔧 Installed',
        variant: 'outline',
        className: `bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/20 dark:text-purple-400 ${animatedClassName}`,
        icon: '🔧'
      };
    case 'ProofUploaded':
      return {
        label: '📸 Proof Uploaded',
        variant: 'outline',
        className: `bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/20 dark:text-indigo-400 ${animatedClassName}`,
        icon: '📸'
      };
    case 'Verified':
      return {
        label: '✅ Verified',
        variant: 'outline',
        className: `bg-green-50 text-green-700 border-green-300 dark:bg-green-950/20 dark:text-green-400 ${animatedClassName}`,
        icon: '✅'
      };
    default:
      return {
        label: status,
        variant: 'outline',
        className: `bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-950/20 dark:text-gray-400 ${animatedClassName}`,
      };
  }
}
