import Prism from "prismjs";
import "prismjs/components/prism-json";

/** Sync highlight for small strings (no yield). */
export const MAX_HIGHLIGHT_SYNC = 102_400;

/** Lines highlighted per animation frame when lazy-loading. */
const LINES_PER_FRAME = 48;

/** Character chunks for single-line (compact) JSON. */
const CHAR_CHUNK_SIZE = 48_000;

const escMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

export function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (ch) => escMap[ch] ?? ch);
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function highlightChunk(chunk: string, grammar: Prism.Grammar): string {
  try {
    return Prism.highlight(chunk, grammar, "json");
  } catch {
    return escapeHtml(chunk);
  }
}

async function highlightByCharChunks(
  text: string,
  grammar: Prism.Grammar,
  onProgress: (html: string) => void,
  signal: AbortSignal,
): Promise<string> {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += CHAR_CHUNK_SIZE) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const slice = text.slice(i, i + CHAR_CHUNK_SIZE);
    parts.push(highlightChunk(slice, grammar));
    onProgress(parts.join(""));
    await yieldToMain();
  }
  return parts.join("");
}

async function highlightByLines(
  text: string,
  grammar: Prism.Grammar,
  onProgress: (html: string) => void,
  signal: AbortSignal,
): Promise<string> {
  const lines = text.split("\n");
  if (lines.length === 1) {
    return highlightByCharChunks(text, grammar, onProgress, signal);
  }

  const parts: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const line = lines[i] ?? "";
    const segment = line + (i < lines.length - 1 ? "\n" : "");
    parts.push(highlightChunk(segment, grammar));
    if (i % LINES_PER_FRAME === 0 || i === lines.length - 1) {
      onProgress(parts.join(""));
      await yieldToMain();
    }
  }
  return parts.join("");
}

/**
 * Highlight JSON for display. Small payloads run synchronously; larger ones
 * stream partial HTML via onProgress between animation frames.
 */
export async function highlightJsonLazy(
  text: string,
  onProgress: (html: string) => void,
  signal: AbortSignal,
): Promise<string> {
  if (text.length === 0) return "";

  const grammar = Prism.languages.json;
  if (grammar === undefined) {
    const plain = escapeHtml(text);
    onProgress(plain);
    return plain;
  }

  if (text.length <= MAX_HIGHLIGHT_SYNC) {
    const html = highlightChunk(text, grammar);
    onProgress(html);
    return html;
  }

  return highlightByLines(text, grammar, onProgress, signal);
}
