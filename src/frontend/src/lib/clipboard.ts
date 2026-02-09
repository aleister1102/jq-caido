export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
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
        document.execCommand("copy");
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
    }
  }
}
