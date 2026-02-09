import { computed, ref, type Ref } from "vue";
import Prism from "prismjs";
import "prismjs/components/prism-json";

const MAX_HIGHLIGHT = 102400; // 100KB
const MAX_DISPLAY = 512000; // 500KB

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function useOutputDisplay(stdout: Ref<string>) {
  const showFullOutput = ref(false);

  const shouldHighlight = computed(() => !!stdout.value && stdout.value.length <= MAX_HIGHLIGHT);

  const displayOutput = computed(() => {
    const val = stdout.value;
    if (!val) return "";
    if (val.length > MAX_DISPLAY && !showFullOutput.value) {
      return escapeHtml(val.slice(0, MAX_DISPLAY))
        + escapeHtml(`\n\n[Output truncated - ${((val.length - MAX_DISPLAY) / 1024).toFixed(1)} KB more. Click "Show Full Output" to display everything.]`);
    }
    if (val.length > MAX_HIGHLIGHT) return escapeHtml(val);
    try { return Prism.highlight(val, Prism.languages.json, "json"); }
    catch { return escapeHtml(val); }
  });

  const isOutputTruncated = computed(() => !!stdout.value && stdout.value.length > MAX_DISPLAY && !showFullOutput.value);

  return { showFullOutput, shouldHighlight, displayOutput, isOutputTruncated };
}
