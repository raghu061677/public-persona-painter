import { supabase } from "@/integrations/supabase/client";

/**
 * Media Type Abbreviations
 */
export const MEDIA_TYPE_CODES: Record<string, string> = {
  "Bus Shelter": "BQS",
  "Bus Queue Shelter": "BQS",
  "Center Median": "CM",
  "Unipole": "UNI",
  "Cantilever": "CAN",
  "Pole Kiosk": "PK",
  "Gantry": "GAN",
  "Billboard": "HOD",
  "Hoarding": "HOD",
};

/**
 * Get city code from city name (first 3 uppercase letters)
 */
export function getCityCode(cityName: string): string {
  return cityName.toUpperCase().substring(0, 3);
}

/**
 * Get media type code
 */
export function getMediaTypeCode(mediaType: string): string {
  return MEDIA_TYPE_CODES[mediaType] || mediaType.toUpperCase().substring(0, 3);
}

/**
 * Get current period in YYYYMM format
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * Pad number to 4 digits
 */
export function padNumber(num: number): string {
  return String(num).padStart(4, '0');
}

/**
 * Get next sequential number from database
 */
async function getNextSequence(
  counterType: string,
  counterKey: string,
  period: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_next_code_number', {
      p_counter_type: counterType,
      p_counter_key: counterKey,
      p_period: period,
    });

    if (error) throw error;
    return data as number;
  } catch (error) {
    console.error('Error getting next sequence:', error);
    // Fallback to random number if database call fails
    return Math.floor(Math.random() * 9999) + 1;
  }
}

/**
 * Generate Media Asset Code
 * Format: CITYCODE-MEDIATYPE-####
 * Example: HYD-BQS-0001
 */
export async function generateMediaAssetCode(
  city: string,
  mediaType: string
): Promise<string> {
  const cityCode = getCityCode(city);
  const mediaTypeCode = getMediaTypeCode(mediaType);
  const counterKey = `${cityCode}_${mediaTypeCode}`;
  
  const sequence = await getNextSequence('ASSET', counterKey, 'permanent');
  
  return `${cityCode}-${mediaTypeCode}-${padNumber(sequence)}`;
}

/**
 * Generate Plan Code
 * Format: PLAN-YYYYMM-####
 * Example: PLAN-202511-0007
 */
export async function generatePlanCode(): Promise<string> {
  const period = getCurrentPeriod(); // Returns YYYYMM format (e.g., "202511")
  const sequence = await getNextSequence('PLAN', 'default', period);
  
  return `PLAN-${period}-${padNumber(sequence)}`;
}

/**
 * Generate Campaign Code
 * Format: CMP-YYYYMM-####
 * Example: CMP-202511-0003
 */
export async function generateCampaignCode(startDate?: Date): Promise<string> {
  const date = startDate || new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const period = `${year}${month}`;
  
  const sequence = await getNextSequence('CAMPAIGN', 'default', period);
  
  return `CMP-${period}-${padNumber(sequence)}`;
}

/**
 * Generate Client Code
 * Format: CLT-STATECODE-####
 * Example: CLT-TG-0004
 */
export async function generateClientCode(stateCode: string): Promise<string> {
  const stateKey = stateCode.toUpperCase();
  const sequence = await getNextSequence('CLIENT', stateKey, 'permanent');
  
  return `CLT-${stateKey}-${padNumber(sequence)}`;
}

/**
 * Generate Work Order Code
 * Format: WO-YYYYMM-####
 * Example: WO-202511-0010
 */
export async function generateWorkOrderCode(): Promise<string> {
  const period = getCurrentPeriod();
  const sequence = await getNextSequence('WORKORDER', 'default', period);
  
  return `WO-${period}-${padNumber(sequence)}`;
}

/**
 * Generate Sales Order Code
 * Format: SO-YYYYMM-####
 * Example: SO-202511-0008
 */
export async function generateSalesOrderCode(): Promise<string> {
  const period = getCurrentPeriod();
  const sequence = await getNextSequence('SALESORDER', 'default', period);
  
  return `SO-${period}-${padNumber(sequence)}`;
}

/**
 * Generate Invoice Code
 * Format: INV-YYYYMM-####
 * Example: INV-202511-0005
 */
export async function generateInvoiceCode(): Promise<string> {
  const period = getCurrentPeriod();
  const sequence = await getNextSequence('INVOICE', 'default', period);
  
  return `INV-${period}-${padNumber(sequence)}`;
}

/**
 * Generate Estimation Code (Quotation)
 * Format: EST-YYYYMM-####
 * Example: EST-202511-0012
 */
export async function generateEstimationCode(): Promise<string> {
  const period = getCurrentPeriod();
  const sequence = await getNextSequence('ESTIMATION', 'default', period);
  
  return `EST-${period}-${padNumber(sequence)}`;
}

/**
 * Generate Expense Code
 * Format: EXP-YYYYMM-####
 * Example: EXP-202511-0003
 */
export async function generateExpenseCode(): Promise<string> {
  const period = getCurrentPeriod();
  const sequence = await getNextSequence('EXPENSE', 'default', period);
  
  return `EXP-${period}-${padNumber(sequence)}`;
}

/**
 * Main code generator function
 * @param type - The entity type to generate code for
 * @param meta - Additional metadata needed for specific types
 */
export async function generateCode(
  type: 'asset' | 'plan' | 'campaign' | 'client' | 'workorder' | 'salesorder' | 'invoice' | 'estimation' | 'expense',
  meta?: {
    city?: string;
    mediaType?: string;
    stateCode?: string;
    startDate?: Date;
  }
): Promise<string> {
  switch (type) {
    case 'asset':
      if (!meta?.city || !meta?.mediaType) {
        throw new Error('City and mediaType are required for asset code generation');
      }
      return generateMediaAssetCode(meta.city, meta.mediaType);
    
    case 'plan':
      return generatePlanCode();
    
    case 'campaign':
      return generateCampaignCode(meta?.startDate);
    
    case 'client':
      if (!meta?.stateCode) {
        throw new Error('StateCode is required for client code generation');
      }
      return generateClientCode(meta.stateCode);
    
    case 'workorder':
      return generateWorkOrderCode();
    
    case 'salesorder':
      return generateSalesOrderCode();
    
    case 'invoice':
      return generateInvoiceCode();
    
    case 'estimation':
      return generateEstimationCode();
    
    case 'expense':
      return generateExpenseCode();
    
    default:
      throw new Error(`Unknown code type: ${type}`);
  }
}
