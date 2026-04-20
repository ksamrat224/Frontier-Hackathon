export function toErrorMessage(
  err: unknown,
  fallback: string,
): string {
  return err instanceof Error ? err.message : fallback;
}

export function parseRequiredNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
