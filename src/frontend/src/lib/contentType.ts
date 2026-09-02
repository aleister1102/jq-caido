const HEAD_SCAN_MAX_CHARS = 64 * 1024;
const CONTENT_TYPE_HEADER = /^content-type[ \t]*:[ \t]*([^\r\n]*)/im;

function headSection(raw: string): string | null {
  const scanWindow = raw.length > HEAD_SCAN_MAX_CHARS ? raw.slice(0, HEAD_SCAN_MAX_CHARS) : raw;

  const crlfBoundary = scanWindow.indexOf("\r\n\r\n");
  if (crlfBoundary !== -1) {
    return scanWindow.slice(0, crlfBoundary);
  }

  const lfBoundary = scanWindow.indexOf("\n\n");
  if (lfBoundary !== -1) {
    return scanWindow.slice(0, lfBoundary);
  }

  // No header/body boundary: the payload is body-only, so there is no Content-Type.
  return null;
}

/** Returns the lowercased MIME type of a raw HTTP message, or null when it has no Content-Type. */
export function extractContentType(raw: string): string | null {
  if (!raw) return null;

  const head = headSection(raw);
  if (head === null) return null;

  const match = CONTENT_TYPE_HEADER.exec(head);
  if (!match) return null;

  const mime = match[1]?.split(";")[0]?.trim().toLowerCase() ?? "";
  return mime.length > 0 ? mime : null;
}

export function isJsonContentType(mime: string): boolean {
  return mime === "text/json"
    || mime === "application/x-ndjson"
    || mime === "application/ndjson"
    || mime.endsWith("/json")
    || mime.endsWith("+json");
}
