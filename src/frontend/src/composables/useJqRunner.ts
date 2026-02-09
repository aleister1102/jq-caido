import { ref, onUnmounted, watch, type Ref, type ComputedRef } from "vue";
import { extractJsonBodyString } from "../lib/extractJsonBody";
import { runJq } from "../lib/runJq";
import { getCaido } from "../caido";

export type RunMeta = {
  query: string;
  flags: string[];
  durationMs: number;
  exitCode: number;
  stdoutLen: number;
  stderrLen: number;
};

export type GraphqlFetchState = {
  tried: boolean;
  ok: boolean;
  kind: "request" | "response" | null;
  id: string | null;
  error: string | null;
  rawLength: number;
};

const EMPTY_GQL: GraphqlFetchState = { tried: false, ok: false, kind: null, id: null, error: null, rawLength: 0 };

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
  const lastRun = ref<RunMeta | null>(null);
  const graphqlFetch = ref<GraphqlFetchState>({ ...EMPTY_GQL });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  const executeJq = async () => {
    const thisGen = ++generation;
    const raw = rawInfo.value.raw;

    stderr.value = "";

    if (!raw) {
      stdout.value = "";
      stderr.value = "Error: No raw content provided to this view mode. Enable Debug to inspect received props.";
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
      graphqlFetch.value = {
        tried: true,
        ok: false,
        kind: null,
        id: null,
        error: null,
        rawLength: 0,
      };

      try {
        if (caido && requestId) {
          graphqlFetch.value.kind = "request";
          graphqlFetch.value.id = requestId;
          const res = await caido.graphql.request({ id: requestId });
          const fullRaw = res?.request?.raw;
          if (typeof fullRaw === "string" && fullRaw.length > 0) {
            graphqlFetch.value.ok = true;
            graphqlFetch.value.rawLength = fullRaw.length;
            jsonBody = extractJsonBodyString(fullRaw);
          }
        } else if (caido && responseId) {
          graphqlFetch.value.kind = "response";
          graphqlFetch.value.id = responseId;
          const res = await caido.graphql.response({ id: responseId });
          const fullRaw = res?.response?.raw;
          if (typeof fullRaw === "string" && fullRaw.length > 0) {
            graphqlFetch.value.ok = true;
            graphqlFetch.value.rawLength = fullRaw.length;
            jsonBody = extractJsonBodyString(fullRaw);
          }
        }
      } catch (e: any) {
        graphqlFetch.value.error = e?.message ? String(e.message) : String(e);
      }
    }

    if (!jsonBody) {
      stdout.value = "";
      stderr.value =
        graphqlFetch.value.tried && !graphqlFetch.value.ok
          ? `Error: Body is not valid JSON (and GraphQL fallback failed: ${graphqlFetch.value.error ?? "no raw returned"})`
          : "Error: Body is not valid JSON";
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

      lastRun.value = {
        query: query.value,
        flags,
        durationMs: Math.max(0, Math.round(ended - started)),
        exitCode: result.exitCode,
        stdoutLen: result.stdout.length,
        stderrLen: result.stderr.length,
      };

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
    lastRun,
    graphqlFetch,
    executeJq,
  };
}