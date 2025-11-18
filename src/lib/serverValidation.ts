// Client-side wrapper for server-side validation
import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'client' | 'media_asset' | 'plan' | 'campaign';
export type Operation = 'create' | 'update' | 'delete';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  company_id?: string;
}

/**
 * Validates entity data using server-side validation edge function
 * This ensures data integrity and security by performing validation server-side
 */
export async function validateMutation(
  entityType: EntityType,
  data: any,
  operation: Operation = 'create'
): Promise<ValidationResult> {
  try {
    const { data: result, error } = await supabase.functions.invoke('validate-mutation', {
      body: {
        entityType,
        data,
        operation
      }
    });

    if (error) {
      console.error('Server validation error:', error);
      return {
        valid: false,
        errors: [error.message || 'Validation failed']
      };
    }

    return result as ValidationResult;
  } catch (error) {
    console.error('Validation request failed:', error);
    return {
      valid: false,
      errors: ['Unable to validate data. Please try again.']
    };
  }
}

/**
 * Hook wrapper for easy use in React components
 */
export function useServerValidation() {
  return {
    validate: validateMutation
  };
}
