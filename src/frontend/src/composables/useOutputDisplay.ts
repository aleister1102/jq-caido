import { computed, ref, type Ref } from "vue";
import Prism from "prismjs";
import "prismjs/components/prism-json";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function useOutputDisplay(stdout: Ref<string>) {
  const showFullOutput = ref(false);

  const highlightedOutput = computed(() => {
    if (!stdout.value) return "";
    // Skip highlighting for large outputs (> 100KB) to maintain performance
    if (stdout.value.length > 102400) {
      return escapeHtml(stdout.value);
    }
    try {
      return Prism.highlight(stdout.value, Prism.languages.json, "json");
    } catch {
      return escapeHtml(stdout.value);
    }
  });

  const shouldHighlight = computed<boolean>(() => {
    return !!stdout.value && stdout.value.length <= 102400;
  });

  const displayOutput = computed(() => {
    if (!stdout.value) return "";
    // For very large outputs (> 500KB), truncate unless explicitly showing full
    const maxDisplayLength = 512000; // 500KB
    if (stdout.value.length > maxDisplayLength && !showFullOutput.value) {
      const truncated = stdout.value.slice(0, maxDisplayLength);
      return truncated + `\n\n[Output truncated - ${((stdout.value.length - maxDisplayLength) / 1024).toFixed(1)} KB more. Click "Show Full Output" to display everything.]`;
    }
    return highlightedOutput.value;
  });

  const isOutputTruncated = computed<boolean>(() => {
    return !!stdout.value && stdout.value.length > 512000 && !showFullOutput.value;
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
