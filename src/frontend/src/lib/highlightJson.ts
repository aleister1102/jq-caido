import Prism from "prismjs";
import "prismjs/components/prism-json";

const escMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

export function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (ch) => escMap[ch] ?? ch);
}

export function highlightJson(text: string): string {
  const grammar = Prism.languages.json;
  if (grammar === undefined) {
    return escapeHtml(text);
  }
  try {
    return Prism.highlight(text, grammar, "json");
  } catch {
    return escapeHtml(text);
  }
}
