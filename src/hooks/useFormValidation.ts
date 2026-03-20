/**
 * Reusable hook for Zod schema validation in forms.
 * Returns field-level errors and a validate function.
 */
import { useState, useCallback } from "react";
import type { ZodSchema, ZodError } from "zod";

export interface FieldErrors {
  [field: string]: string;
}

export function useFormValidation<T>(schema: ZodSchema<T>) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  /** Validate data against schema. Returns parsed data on success, null on failure. */
  const validate = useCallback(
    (data: unknown): T | null => {
      const result = schema.safeParse(data);
      if (result.success) {
        setFieldErrors({});
        return result.data;
      }
      const errors: FieldErrors = {};
      (result.error as ZodError).issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (!errors[path]) {
          errors[path] = issue.message;
        }
      });
      setFieldErrors(errors);
      return null;
    },
    [schema]
  );

  /** Clear a specific field error (e.g. on change) */
  const clearError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /** Clear all errors */
  const clearAll = useCallback(() => setFieldErrors({}), []);

  return { fieldErrors, validate, clearError, clearAll };
}
