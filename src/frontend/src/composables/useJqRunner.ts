import { ref, onUnmounted, watch, type Ref, type ComputedRef } from "vue";
import { extractJsonBodyString } from "../lib/extractJsonBody";
import { runJq } from "../lib/runJq";
import { getCaido } from "../caido";

export type RunMeta = { query: string; flags: string[]; durationMs: number; exitCode: number; stdoutLen: number; stderrLen: number };

export type GraphqlFetchState = { tried: boolean; ok: boolean; kind: "request" | "response" | null; id: string | null; error: string | null; rawLength: number };

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
  saveSettings: () => void,
) {
  const stdout = ref("");
  const stderr = ref("");
  const isLoading = ref(false);
  const lastRun = ref<RunMeta | null>(null);
  const graphqlFetch = ref<GraphqlFetchState>({ ...EMPTY_GQL });
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let runId = 0;
  let ready = false;

  const executeJq = async () => {
    const thisRun = ++runId;
    let raw = rawInfo.value.raw;
    stderr.value = "";

    if (!raw) {
      stdout.value = "";
      stderr.value = "Error: No raw content provided to this view mode. Enable Debug to inspect received props.";
      return;
    }

    let jsonBody = extractJsonBodyString(raw);

    // If Caido only provided headers (no body), fall back to GraphQL fetch.
    if (!jsonBody) {
      const caido = getCaido();
      const { requestId, responseId } = selectedIds.value;
      const fetchId = requestId ?? responseId;
      const fetchKind: "request" | "response" = requestId ? "request" : "response";
      graphqlFetch.value = { ...EMPTY_GQL, tried: true };

      try {
        if (caido && fetchId) {
          graphqlFetch.value.kind = fetchKind;
          graphqlFetch.value.id = fetchId;
          const res = fetchKind === "request"
            ? await caido.graphql.request({ id: fetchId })
            : await caido.graphql.response({ id: fetchId });
          if (thisRun !== runId) return;
          const fullRaw = (fetchKind === "request" ? (res as any)?.request?.raw : (res as any)?.response?.raw) as string | undefined;
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
      stderr.value = graphqlFetch.value.tried && !graphqlFetch.value.ok
        ? `Error: Body is not valid JSON (and GraphQL fallback failed: ${graphqlFetch.value.error ?? "no raw returned"})`
        : "Error: Body is not valid JSON";
      return;
    }

    isLoading.value = true;

    const flags: string[] = [];
    if (isCompact.value) flags.push("-c");
    if (isRaw.value) flags.push("-r");

    let effectiveQuery = query.value || ".";
    if (keysOnly.value) effectiveQuery = `(${effectiveQuery}) | keys`;
    if (filterNulls.value) effectiveQuery = `(${effectiveQuery}) | walk(if type == "object" then with_entries(select(.value != null)) else . end)`;

    const started = performance.now?.() ?? Date.now();
    const result = await runJq(jsonBody, effectiveQuery, flags);
    if (thisRun !== runId) return;
    const ended = performance.now?.() ?? Date.now();

    stdout.value = result.stdout;
    stderr.value = result.stderr
      || (result.timedOut ? "Error: jq-wasm timed out (likely wasm failed to load in Caido)" : "")
      || (result.exitCode !== 0 ? `Error: jq exited with code ${result.exitCode}` : "");
    isLoading.value = false;

    lastRun.value = {
      query: query.value, flags,
      durationMs: Math.max(0, Math.round(ended - started)),
      exitCode: result.exitCode, stdoutLen: result.stdout.length, stderrLen: result.stderr.length,
    };

    saveSettings();
    updateParsedJson(jsonBody);
  };

  onUnmounted(() => { if (debounceTimer) clearTimeout(debounceTimer); });

  watch([() => rawInfo.value.raw, isCompact, isRaw, keysOnly, filterNulls], () => {
    if (!ready) return;
    void executeJq();
  });

  watch(() => query.value, () => {
    if (!ready) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { void executeJq(); }, 300);
  });

  const start = () => { ready = true; };

  return { stdout, stderr, isLoading, lastRun, graphqlFetch, executeJq, start };
}
