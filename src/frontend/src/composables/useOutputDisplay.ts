import { computed, type ComputedRef, type Ref } from "vue";
import { JQ_HIGHLIGHT_MAX_BYTES, shouldHighlightOutput } from "../../../shared/jqPolicy";
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
    return shouldHighlight.value
      ? ""
      : `Highlighting off above ${Math.round(JQ_HIGHLIGHT_MAX_BYTES / 1_000)} KB`;
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
