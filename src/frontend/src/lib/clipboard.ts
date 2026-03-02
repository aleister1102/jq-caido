/**
 * Copy text to clipboard and return success status.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator?.clipboard?.writeText !== "function") {
      return false;
    }

    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
