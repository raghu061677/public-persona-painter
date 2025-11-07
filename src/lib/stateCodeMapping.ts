/**
 * Official Indian State Codes (GST Format)
 * Source: GST Registration Portal
 */
export const INDIAN_STATE_CODES: Record<string, string> = {
  // States
  'Andhra Pradesh': 'AP',
  'Arunachal Pradesh': 'AR',
  'Assam': 'AS',
  'Bihar': 'BR',
  'Chhattisgarh': 'CG',
  'Goa': 'GA',
  'Gujarat': 'GJ',
  'Haryana': 'HR',
  'Himachal Pradesh': 'HP',
  'Jharkhand': 'JH',
  'Karnataka': 'KA',
  'Kerala': 'KL',
  'Madhya Pradesh': 'MP',
  'Maharashtra': 'MH',
  'Manipur': 'MN',
  'Meghalaya': 'ML',
  'Mizoram': 'MZ',
  'Nagaland': 'NL',
  'Odisha': 'OD',
  'Punjab': 'PB',
  'Rajasthan': 'RJ',
  'Sikkim': 'SK',
  'Tamil Nadu': 'TN',
  'Telangana': 'TG',
  'Tripura': 'TR',
  'Uttar Pradesh': 'UP',
  'Uttarakhand': 'UK',
  'West Bengal': 'WB',
  
  // Union Territories
  'Andaman and Nicobar Islands': 'AN',
  'Chandigarh': 'CH',
  'Dadra and Nagar Haveli and Daman and Diu': 'DD',
  'Delhi': 'DL',
  'Jammu and Kashmir': 'JK',
  'Ladakh': 'LA',
  'Lakshadweep': 'LD',
  'Puducherry': 'PY',
};

/**
 * Get official state code from state name
 * @param stateName - Full state name
 * @returns Official 2-letter state code
 */
export function getStateCode(stateName: string): string {
  // Try exact match first
  if (INDIAN_STATE_CODES[stateName]) {
    return INDIAN_STATE_CODES[stateName];
  }
  
  // Try case-insensitive match
  const stateKey = Object.keys(INDIAN_STATE_CODES).find(
    key => key.toLowerCase() === stateName.toLowerCase()
  );
  
  if (stateKey) {
    return INDIAN_STATE_CODES[stateKey];
  }
  
  // Fallback: use first 2 letters if no match found
  return stateName.substring(0, 2).toUpperCase();
}

/**
 * Validate if a state code is valid
 */
export function isValidStateCode(code: string): boolean {
  return Object.values(INDIAN_STATE_CODES).includes(code.toUpperCase());
}
