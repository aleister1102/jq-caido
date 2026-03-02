import { computed, ref, watch, type Ref } from "vue";
import Prism from "prismjs";
import "prismjs/components/prism-json";

const MAX_HIGHLIGHT = 102400; // 100KB
const MAX_DISPLAY = 512000; // 500KB
declare const __JQ_DEBUG__: boolean;
const isDebug = typeof __JQ_DEBUG__ !== "undefined" && __JQ_DEBUG__;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function useOutputDisplay(stdout: Ref<string>) {
  const showFullOutput = ref(false);

  const shouldHighlight = computed(() => !!stdout.value && stdout.value.length <= MAX_HIGHLIGHT);

  const displayOutput = computed(() => {
    const val = stdout.value;
    if (!val) return "";
    const start = performance.now();
    let result = "";
    if (val.length > MAX_DISPLAY) {
      result = escapeHtml(val.slice(0, MAX_DISPLAY))
        + escapeHtml(`\n\n[Output truncated - ${((val.length - MAX_DISPLAY) / 1024).toFixed(1)} KB more.]`);
    } else if (val.length > MAX_HIGHLIGHT) {
      result = escapeHtml(val);
    } else {
      try { result = Prism.highlight(val, Prism.languages.json, "json"); }
      catch { result = escapeHtml(val); }
    }
    const end = performance.now();
    if (isDebug && val.length > 500_000) {
      console.debug(`[JQ] displayOutput computed in ${(end - start).toFixed(2)}ms for ${val.length} chars`);
    }
    return result;
  });

  const isOutputTruncated = computed(() => !!stdout.value && stdout.value.length > MAX_DISPLAY);

  // Auto-reset when new output arrives so truncation is re-applied for large results.
  watch(stdout, () => {
    showFullOutput.value = false;
  });

  const resetFullOutput = () => {
    showFullOutput.value = false;
  };

  return {
    showFullOutput,
    shouldHighlight,
    displayOutput,
    isOutputTruncated,
    resetFullOutput,
  };
}