/**
 * Tiny inline field error display.
 * Usage: <FieldError error={fieldErrors.my_field} />
 */
export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-[0.8rem] font-medium text-destructive mt-1">{error}</p>;
}
