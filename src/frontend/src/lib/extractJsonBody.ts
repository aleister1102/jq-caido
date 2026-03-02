let cachedRaw: string | null = null;
let cachedResult: string | null = null;

export function extractJsonBodyString(raw: string): string | null {
  if (!raw) return null;

  // Memoize: same raw input → return cached result
  if (cachedRaw === raw) return cachedResult;

  let result: string | null = null;

  // If we have an HTTP message, find separator using index-based lookup (avoid split/join allocation).
  const idx2 = raw.indexOf("\r\n\r\n");
  if (idx2 !== -1) {
    result = raw.slice(idx2 + 4).trim();
  } else {
    const idx1 = raw.indexOf("\n\n");
    if (idx1 !== -1) {
      result = raw.slice(idx1 + 2).trim();
    } else {
      // Otherwise, assume it's already a JSON string (body-only).
      result = raw.trim();
    }
  }

  cachedRaw = raw;
  cachedResult = result;
  return result;
}
