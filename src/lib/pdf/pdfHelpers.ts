/**
 * PDF Helper utilities for currency formatting and contact extraction
 */

/**
 * Format currency in Indian Rupees using Intl (₹)
 * NOTE: Requires Unicode font (NotoSans) to be embedded in jsPDF output.
 */
export const formatINR = (value: number = 0): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
};

/**
 * Alias used across PDF generators
 */
export const formatCurrencyForPDF = (amount: number): string => formatINR(amount);

/**
 * Get primary contact name from client data
 * Priority:
 * 1. primary_contact_name field
 * 2. First contact from contacts array
 * 3. Fallback to "N/A"
 */
export const getPrimaryContactName = (client: any): string => {
  // Check primary_contact_name first
  if (client?.primary_contact_name && client.primary_contact_name.trim()) {
    return client.primary_contact_name.trim();
  }
  
  // Check primary_contact field
  if (client?.primary_contact && client.primary_contact.trim()) {
    return client.primary_contact.trim();
  }
  
  // Check contacts array
  if (client?.contacts && Array.isArray(client.contacts) && client.contacts.length > 0) {
    const contact = client.contacts.find((c: any) => c?.name || c?.first_name);
    if (contact) {
      if (contact.name) return contact.name.trim();
      if (contact.first_name) {
        const lastName = contact.last_name ? ` ${contact.last_name}` : '';
        return `${contact.first_name}${lastName}`.trim();
      }
    }
  }
  
  // Check contact_name field
  if (client?.contact_name && client.contact_name.trim()) {
    return client.contact_name.trim();
  }
  
  return 'N/A';
};

/**
 * Get client display name
 */
export const getClientDisplayName = (client: any): string => {
  return client?.name || client?.company || client?.display_name || 'Client';
};

/**
 * Get client address for PDF
 */
export const getClientAddress = (client: any): string => {
  return client?.billing_address_line1 || client?.address || client?.billing_address || '';
};

/**
 * Get client city
 */
export const getClientCity = (client: any): string => {
  return client?.billing_city || client?.city || '';
};

/**
 * Get client state
 */
export const getClientState = (client: any): string => {
  return client?.billing_state || client?.state || '';
};

/**
 * Get client pincode
 */
export const getClientPincode = (client: any): string => {
  return client?.billing_pincode || client?.pincode || '';
};
