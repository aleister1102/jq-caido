export function extractJsonBodyString(raw: string): string | null {
  if (!raw) return null;

  const crlfBoundary = raw.indexOf("\r\n\r\n");
  if (crlfBoundary !== -1) {
    return raw.slice(crlfBoundary + 4).trim();
  }

  const lfBoundary = raw.indexOf("\n\n");
  if (lfBoundary !== -1) {
    return raw.slice(lfBoundary + 2).trim();
  }

  // Otherwise, assume it's already a JSON string (body-only).
  return raw.trim();
}
