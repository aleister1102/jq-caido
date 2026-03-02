/**
 * Copy text to clipboard and return success status.
 * Falls back to execCommand if Clipboard API is unavailable.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.readOnly = true;
      ta.value = text;
      ta.style.cssText = "position:fixed;left:-9999px;top:0";
      const previousActive = document.activeElement as HTMLElement | null;
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        const success = document.execCommand("copy");
        return success;
      } finally {
        if (ta.parentNode) {
          document.body.removeChild(ta);
        }
        if (previousActive && typeof previousActive.focus === "function") {
          previousActive.focus();
        }
      }
    } catch (e) {
      console.warn("JQ: clipboard copy failed", e);
      return false;
    }
  }
}
