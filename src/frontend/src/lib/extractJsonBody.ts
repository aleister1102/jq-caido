export function extractJsonBodyString(raw: string): string | null {
  if (!raw) return null;

  // If we have an HTTP message, split headers/body.
  if (raw.includes("\r\n\r\n") || raw.includes("\n\n")) {
    const separator = raw.includes("\r\n\r\n") ? "\r\n\r\n" : "\n\n";
    const parts = raw.split(separator);
    if (parts.length < 2) return null;
    return parts.slice(1).join(separator).trim();
  }

  // Otherwise, assume it's already a JSON string (body-only).
  return raw.trim();
}
