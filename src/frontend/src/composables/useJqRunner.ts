import { ref, onUnmounted, watch, type Ref, type ComputedRef } from "vue";
import { extractJsonBodyString } from "../lib/extractJsonBody";
import { runJq } from "../lib/runJq";

export function useJqRunner(
  rawInfo: ComputedRef<{ raw: string; source: string }>,
  selectedIds: ComputedRef<{ requestId: string | null; responseId: string | null }>,
  query: Ref<string>,
  isCompact: Ref<boolean>,
  isRaw: Ref<boolean>,
  keysOnly: Ref<boolean>,
  filterNulls: Ref<boolean>,
  isLargePayload: ComputedRef<boolean>,
  clearParsedJson: () => void,
) {
  const stdout = ref("");
  const stderr = ref("");
  const isLoading = ref(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  const executeJq = async () => {
    const thisGen = ++generation;
    const raw = rawInfo.value.raw;

    stderr.value = "";

    if (!raw) {
      stdout.value = "";
      stderr.value = "Error: No raw content provided to this view mode.";
      if (thisGen === generation) {
        isLoading.value = false;
      }
      return;
    }

    const jsonBody = extractJsonBodyString(raw);
    if (!jsonBody) {
      stdout.value = "";
      clearParsedJson();
      stderr.value = "Error: No JSON body found in the selected message.";
      if (thisGen === generation) {
        isLoading.value = false;
      }
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
    if (filterNulls.value && !isLargePayload.value) {
      effectiveQuery = `(${effectiveQuery}) | walk(if type == "object" then with_entries(select(.value != null)) else . end)`;
    }

    try {
      const result = await runJq(jsonBody, effectiveQuery, flags);

      if (thisGen !== generation) return; // stale, discard

      stdout.value = result.stdout;
      const runnerError =
        result.stderr ||
        (result.timedOut ? "Error: jq-wasm timed out (likely wasm failed to load in Caido)" : "") ||
        (result.exitCode !== 0 ? `Error: jq exited with code ${result.exitCode}` : "");
      const nullsDisabledWarning = filterNulls.value && isLargePayload.value
        ? "Warning: No Nulls is disabled for payloads over 10 MB."
        : "";
      stderr.value = [runnerError, nullsDisabledWarning].filter(Boolean).join("\n");
    } finally {
      if (thisGen === generation) {
        isLoading.value = false;
      }
    }
  };

  const executeJqDebounced = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      void executeJq();
    }, 300);
  };

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  watch([() => rawInfo.value.raw, isCompact, isRaw, keysOnly, filterNulls], () => {
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