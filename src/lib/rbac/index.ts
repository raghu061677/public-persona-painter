export { normalizeRole, getPermissionQueryRole, getRoleLabel, getRoleBadgeVariant, STANDARD_COMPANY_ROLES, SENSITIVE_FIELDS } from './roleNormalization';
export type { StandardRole, AnyRole, SensitiveField } from './roleNormalization';
export { EMPTY_PERMISSION, FULL_PERMISSION, ALL_MODULES, checkScopeAccess, mergePermissions, isRecordOwner, isAssignedToRecord } from './permissions';
export type { ModuleKey, ModulePermission, PermissionMatrix, ScopeMode } from './permissions';
export {
  filterRestrictedFields,
  filterRestrictedRecords,
  getVisibleColumns,
  isFieldRestricted,
  getMaskedValue,
  getRestrictedFields,
  getRestrictedFieldNames,
  hasFinancialFields,
  hasContactFields,
} from './restrictedFields';
export type { RestrictedModule, FieldCategory, FieldAccessContext, RestrictedFieldEntry } from './restrictedFields';
