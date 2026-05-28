import { ref, onUnmounted, watch, type Ref, type ComputedRef } from "vue";
import { runJq } from "../lib/runJq";
import {
  FILTER_NULLS_MAX_BYTES,
  LARGE_PAYLOAD_THRESHOLD_BYTES,
  OVERSIZED_PAYLOAD_BYTES,
} from "./useRawPayload";

export function useJqRunner(
  bodyText: ComputedRef<string>,
  query: Ref<string>,
  isCompact: Ref<boolean>,
  isRaw: Ref<boolean>,
  keysOnly: Ref<boolean>,
  filterNulls: Ref<boolean>,
  isOversized: ComputedRef<boolean>,
  isLargePayload: ComputedRef<boolean>,
  clearParsedJson: () => void,
) {
  const stdout = ref("");
  const stderr = ref("");
  const isLoading = ref(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  const debounceMs = () => {
    const len = bodyText.value.length;
    if (len > LARGE_PAYLOAD_THRESHOLD_BYTES) return 800;
    if (len > 10_000_000) return 500;
    return 300;
  };

  const executeJq = async () => {
    const thisGen = ++generation;

    stderr.value = "";

    if (isOversized.value) {
      stdout.value = "";
      clearParsedJson();
      stderr.value = `Payload too large (> ${Math.round(OVERSIZED_PAYLOAD_BYTES / 1_000_000)} MB) — jq is disabled to prevent UI freeze.`;
      if (thisGen === generation) isLoading.value = false;
      return;
    }

    const jsonBody = bodyText.value;
    if (!jsonBody) {
      stdout.value = "";
      clearParsedJson();
      stderr.value = "Error: No content provided to this view mode.";
      if (thisGen === generation) isLoading.value = false;
      return;
    }

    isLoading.value = true;

    const flags: string[] = [];
    if (isCompact.value) flags.push("-c");
    if (isRaw.value) flags.push("-r");

    let effectiveQuery = query.value || ".";
    if (keysOnly.value) {
      effectiveQuery = `(${effectiveQuery}) | keys`;
    }
    const bodyLen = jsonBody.length;
    const nullsWalkOk = bodyLen <= FILTER_NULLS_MAX_BYTES;
    if (filterNulls.value && nullsWalkOk) {
      effectiveQuery = `(${effectiveQuery}) | walk(if type == "object" then with_entries(select(.value != null)) else . end)`;
    }

    try {
      const result = await runJq(jsonBody, effectiveQuery, flags);

      if (thisGen !== generation) return;

      stdout.value = result.stdout;
      const runnerError =
        result.stderr ||
        (result.timedOut ? "Error: jq-wasm timed out (likely wasm failed to load in Caido)" : "") ||
        (result.exitCode !== 0 ? `Error: jq exited with code ${result.exitCode}` : "");
      const nullsDisabledWarning =
        filterNulls.value && !nullsWalkOk
          ? `Warning: No Nulls (walk) is disabled for payloads over ${Math.round(FILTER_NULLS_MAX_BYTES / 1_000_000)} MB — it is too slow in jq-wasm.`
          : "";
      stderr.value = [runnerError, nullsDisabledWarning].filter(Boolean).join("\n");
    } finally {
      if (thisGen === generation) isLoading.value = false;
    }
  };

  const executeJqDebounced = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void executeJq();
    }, debounceMs());
  };

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  watch([bodyText, isCompact, isRaw, keysOnly, filterNulls], () => {
    void executeJq();
  });

  watch(
    () => query.value,
    () => {
      executeJqDebounced();
    },
  );

  return {
    stdout,
    stderr,
    isLoading,
    executeJq,
  };
}
