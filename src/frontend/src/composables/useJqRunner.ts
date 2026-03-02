import { ref, onUnmounted, watch, type Ref, type ComputedRef } from "vue";
import { extractJsonBodyString } from "../lib/extractJsonBody";
import { runJq } from "../lib/runJq";
import { getCaido } from "../caido";

export function useJqRunner(
  rawInfo: ComputedRef<{ raw: string; source: string }>,
  selectedIds: ComputedRef<{ requestId: string | null; responseId: string | null }>,
  query: Ref<string>,
  isCompact: Ref<boolean>,
  isRaw: Ref<boolean>,
  keysOnly: Ref<boolean>,
  filterNulls: Ref<boolean>,
  updateParsedJson: (json: string) => void,
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

    let jsonBody = extractJsonBodyString(raw);

    // If Caido only provided headers (no body), fall back to GraphQL request/response(id)->raw
    // and retry parsing from the fully stored raw value.
    if (!jsonBody) {
      const caido = getCaido();
      const { requestId, responseId } = selectedIds.value;
      let graphqlTried = true;
      let graphqlOk = false;
      let graphqlError: string | null = null;

      try {
        if (caido && requestId) {
          const res = await caido.graphql.request({ id: requestId });
          const fullRaw = res?.request?.raw;
          if (typeof fullRaw === "string" && fullRaw.length > 0) {
            graphqlOk = true;
            jsonBody = extractJsonBodyString(fullRaw);
          }
        } else if (caido && responseId) {
          const res = await caido.graphql.response({ id: responseId });
          const fullRaw = res?.response?.raw;
          if (typeof fullRaw === "string" && fullRaw.length > 0) {
            graphqlOk = true;
            jsonBody = extractJsonBodyString(fullRaw);
          }
        }
      } catch (e: any) {
        graphqlError = e?.message ? String(e.message) : String(e);
      }

      if (!jsonBody) {
        stdout.value = "";
        stderr.value =
          graphqlTried && !graphqlOk
            ? `Error: Body is not valid JSON (and GraphQL fallback failed: ${graphqlError ?? "no raw returned"})`
            : "Error: Body is not valid JSON";
        if (thisGen === generation) isLoading.value = false;
        return;
      }
    }

    isLoading.value = true;

    const flags: string[] = [];
    if (isCompact.value) flags.push("-c");
    if (isRaw.value) flags.push("-r");

    let effectiveQuery = query.value || ".";
    if (keysOnly.value) {
      effectiveQuery = `(${effectiveQuery}) | keys`;
    }
    if (filterNulls.value) {
      effectiveQuery = `(${effectiveQuery}) | walk(if type == "object" then with_entries(select(.value != null)) else . end)`;
    }

    try {
      const started = performance.now?.() ?? Date.now();
      const result = await runJq(jsonBody, effectiveQuery, flags);
      const ended = performance.now?.() ?? Date.now();

      if (thisGen !== generation) return; // stale, discard

      stdout.value = result.stdout;
      stderr.value =
        result.stderr ||
        (result.timedOut ? "Error: jq-wasm timed out (likely wasm failed to load in Caido)" : "") ||
        (result.exitCode !== 0 ? `Error: jq exited with code ${result.exitCode}` : "");

      updateParsedJson(jsonBody);
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