/**
 * Shared bank details configuration.
 * All PDF exports and invoice views pull from this default,
 * which can be overridden by company-level bank details from the DB.
 */

export interface CompanyBankDetails {
  bankName: string;
  branch: string;
  accountName: string;
  accountNo: string;
  ifsc: string;
}

export const DEFAULT_BANK_DETAILS: CompanyBankDetails = {
  bankName: 'HDFC Bank Limited',
  branch: 'Karkhana Road, Secunderabad – 500009',
  accountName: 'Matrix Network Solutions',
  accountNo: '50200010727301',
  ifsc: 'HDFC0001555',
};

/**
 * Extracts bank details from a company record, falling back to defaults.
 */
export function getBankDetailsFromCompany(company: any): CompanyBankDetails {
  if (!company) return DEFAULT_BANK_DETAILS;
  return {
    bankName: company.bank_name || DEFAULT_BANK_DETAILS.bankName,
    branch: company.bank_branch || DEFAULT_BANK_DETAILS.branch,
    accountName: company.bank_account_name || company.name || DEFAULT_BANK_DETAILS.accountName,
    accountNo: company.bank_account_no || DEFAULT_BANK_DETAILS.accountNo,
    ifsc: company.bank_ifsc || DEFAULT_BANK_DETAILS.ifsc,
  };
}
