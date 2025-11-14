/**
 * Type-safe transformers for converting between snake_case (database) 
 * and camelCase (frontend) naming conventions
 */

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S;

type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? U extends Uncapitalize<U>
    ? `${Lowercase<T>}${CamelToSnakeCase<U>}`
    : `${Lowercase<T>}_${CamelToSnakeCase<Uncapitalize<U>>}`
  : S;

type SnakeToCamelKeys<T> = {
  [K in keyof T as SnakeToCamelCase<K & string>]: T[K] extends object
    ? SnakeToCamelKeys<T[K]>
    : T[K];
};

type CamelToSnakeKeys<T> = {
  [K in keyof T as CamelToSnakeCase<K & string>]: T[K] extends object
    ? CamelToSnakeKeys<T[K]>
    : T[K];
};

/**
 * Convert a string from snake_case to camelCase
 * @example snakeToCamel('asset_id') // 'assetId'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a string from camelCase to snake_case
 * @example camelToSnake('assetId') // 'asset_id'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively transform object keys from snake_case to camelCase
 * @param obj - Object with snake_case keys (from database)
 * @returns Object with camelCase keys (for frontend)
 * 
 * @example
 * const dbData = { asset_id: '123', client_name: 'ABC' };
 * const frontendData = transformKeys(dbData);
 * // Result: { assetId: '123', clientName: 'ABC' }
 */
export function transformKeys<T extends Record<string, any>>(
  obj: T
): SnakeToCamelKeys<T> {
  if (obj === null || obj === undefined) {
    return obj as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' ? transformKeys(item) : item
    ) as any;
  }

  if (typeof obj !== 'object') {
    return obj as any;
  }

  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = transformKeys(value);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        typeof item === 'object' && item !== null ? transformKeys(item) : item
      );
    } else {
      result[camelKey] = value;
    }
  }

  return result;
}

/**
 * Recursively transform object keys from camelCase to snake_case
 * @param obj - Object with camelCase keys (from frontend)
 * @returns Object with snake_case keys (for database)
 * 
 * @example
 * const frontendData = { assetId: '123', clientName: 'ABC' };
 * const dbData = transformKeysToSnake(frontendData);
 * // Result: { asset_id: '123', client_name: 'ABC' }
 */
export function transformKeysToSnake<T extends Record<string, any>>(
  obj: T
): CamelToSnakeKeys<T> {
  if (obj === null || obj === undefined) {
    return obj as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' ? transformKeysToSnake(item) : item
    ) as any;
  }

  if (typeof obj !== 'object') {
    return obj as any;
  }

  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = transformKeysToSnake(value);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map((item) =>
        typeof item === 'object' && item !== null ? transformKeysToSnake(item) : item
      );
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
}

/**
 * Transform Supabase query response to camelCase
 * Handles both single objects and arrays
 * 
 * @example
 * const { data } = await supabase.from('campaigns').select('*');
 * const campaigns = transformSupabaseResponse(data);
 * // Now use: campaigns[0].clientId instead of campaigns[0].client_id
 */
export function transformSupabaseResponse<T extends Record<string, any> | Record<string, any>[] | null>(
  data: T
): T extends Array<any> ? SnakeToCamelKeys<T[number]>[] : T extends object ? SnakeToCamelKeys<T> : T {
  if (!data) return data as any;
  
  if (Array.isArray(data)) {
    return data.map(transformKeys) as any;
  }
  
  return transformKeys(data) as any;
}

/**
 * Prepare frontend data for Supabase insert/update
 * Converts camelCase keys to snake_case
 * 
 * @example
 * const frontendData = { assetId: '123', clientName: 'ABC' };
 * await supabase.from('campaigns').insert(prepareForSupabase(frontendData));
 */
export function prepareForSupabase<T extends Record<string, any>>(
  data: T
): CamelToSnakeKeys<T> {
  return transformKeysToSnake(data);
}

/**
 * Type guard to check if a value is a plain object
 */
function isPlainObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  );
}
