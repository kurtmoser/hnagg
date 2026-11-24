/** Message of a caught value, which TypeScript types as unknown/any. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
