import { computed, onScopeDispose, ref, watch, type Ref } from "vue";

import {
  escapeHtml,
  highlightJsonLazy,
  MAX_HIGHLIGHT_SYNC,
} from "../lib/highlightJson";

export const MAX_DISPLAY = 512_000;

declare const __JQ_DEBUG__: boolean;
const isDebug = typeof __JQ_DEBUG__ !== "undefined" && __JQ_DEBUG__;

function buildViewParts(val: string): { body: string; suffix: string } {
  if (val.length <= MAX_DISPLAY) {
    return { body: val, suffix: "" };
  }
  const body = val.slice(0, MAX_DISPLAY);
  const suffix = `\n\n[Output truncated - ${((val.length - MAX_DISPLAY) / 1024).toFixed(1)} KB more.]`;
  return { body, suffix };
}

export function useOutputDisplay(stdout: Ref<string>) {
  const showFullOutput = ref(false);
  const displayOutput = ref("");
  const shouldHighlight = ref(false);
  const isHighlighting = ref(false);

  let abortController: AbortController | null = null;

  const isOutputTruncated = computed(
    () => !!stdout.value && stdout.value.length > MAX_DISPLAY,
  );

  const scheduleHighlight = async (val: string) => {
    abortController?.abort();
    const ac = new AbortController();
    abortController = ac;
    const { signal } = ac;

    if (!val) {
      displayOutput.value = "";
      shouldHighlight.value = false;
      isHighlighting.value = false;
      return;
    }

    const { body, suffix } = buildViewParts(val);
    const suffixHtml = suffix ? escapeHtml(suffix) : "";
    const plainBody = escapeHtml(body);

    displayOutput.value = plainBody + suffixHtml;
    shouldHighlight.value = true;
    isHighlighting.value = body.length > MAX_HIGHLIGHT_SYNC;

    const start = performance.now();

    try {
      const highlightedBody = await highlightJsonLazy(
        body,
        (partial) => {
          if (!signal.aborted) {
            displayOutput.value = partial + suffixHtml;
          }
        },
        signal,
      );
      if (!signal.aborted) {
        displayOutput.value = highlightedBody + suffixHtml;
      }
    } catch (err) {
      if (signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
        return;
      }
      displayOutput.value = plainBody + suffixHtml;
    } finally {
      if (!signal.aborted) {
        isHighlighting.value = false;
      }
      if (isDebug && body.length > 500_000) {
        console.debug(
          `[JQ] highlight finished in ${(performance.now() - start).toFixed(2)}ms for ${body.length} chars`,
        );
      }
    }
  };

  watch(stdout, (val) => {
    void scheduleHighlight(val);
  }, { immediate: true });

  watch(stdout, () => {
    showFullOutput.value = false;
  });

  onScopeDispose(() => {
    abortController?.abort();
  });

  const resetFullOutput = () => {
    showFullOutput.value = false;
  };

  return {
    showFullOutput,
    shouldHighlight,
    isHighlighting,
    displayOutput,
    isOutputTruncated,
    resetFullOutput,
  };
}
