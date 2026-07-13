import { computed, type ComputedRef, type Ref } from "vue";
import { shouldHighlightOutput } from "../../../shared/jqPolicy";
import { highlightJson } from "../lib/highlightJson";

export function useOutputDisplay(
  stdout: Ref<string> | ComputedRef<string>,
  stdoutBytes: Ref<number> | ComputedRef<number>,
) {
  const shouldHighlight = computed(
    () => stdout.value.length > 0 && shouldHighlightOutput(stdoutBytes.value),
  );
  const statusMessage = computed(() => {
    if (!stdout.value) {
      return "";
    }
    return shouldHighlight.value ? "" : "Highlighting disabled for large output.";
  });
  const displayOutput = computed(() => {
    if (!stdout.value) {
      return "";
    }
    return shouldHighlight.value ? highlightJson(stdout.value) : stdout.value;
  });

  return {
    shouldHighlight,
    displayOutput,
    statusMessage,
  };
}
