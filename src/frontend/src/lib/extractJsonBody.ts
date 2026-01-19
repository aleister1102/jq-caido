export function extractJsonBody(raw: string): any {
  if (!raw) return null;

  // If we have an HTTP message, split headers/body.
  if (raw.includes("\r\n\r\n") || raw.includes("\n\n")) {
    const separator = raw.includes("\r\n\r\n") ? "\r\n\r\n" : "\n\n";
    const parts = raw.split(separator);
    if (parts.length < 2) return null;
    const body = parts.slice(1).join(separator).trim();

    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  // Otherwise, assume it's already a JSON string (body-only).
  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
}
