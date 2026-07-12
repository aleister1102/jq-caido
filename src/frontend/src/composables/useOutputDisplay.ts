import { ref, watch, type ComputedRef, type Ref } from "vue";
import { shouldHighlightOutput } from "../../../shared/jqPolicy";
import { highlightJson } from "../lib/highlightJson";

export function useOutputDisplay(
  stdout: Ref<string> | ComputedRef<string>,
  stdoutBytes: Ref<number> | ComputedRef<number>,
) {
  const displayOutput = ref("");
  const shouldHighlight = ref(false);
  const statusMessage = ref("");

  watch(
    [stdout, stdoutBytes],
    ([text, bytes]) => {
      if (!text) {
        displayOutput.value = "";
        shouldHighlight.value = false;
        statusMessage.value = "";
        return;
      }

      shouldHighlight.value = shouldHighlightOutput(bytes);
      statusMessage.value = shouldHighlight.value ? "" : "Highlighting disabled for large output.";
      displayOutput.value = shouldHighlight.value ? highlightJson(text) : text;
    },
    { immediate: true },
  );

  return {
    shouldHighlight,
    displayOutput,
    statusMessage,
  };
}
