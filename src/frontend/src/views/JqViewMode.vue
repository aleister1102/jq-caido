<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
import { extractJsonBody } from "../lib/extractJsonBody";
import { runJq } from "../lib/runJq";
import { getCaido } from "../caido";
import Prism from "prismjs";
import "prismjs/components/prism-json";

type RawCarrier = { raw?: string } | undefined;

const props = defineProps<{
  // Caido may pass the current message under different prop names depending on surface/view.
  data?: RawCarrier;
  request?: RawCarrier;
  response?: RawCarrier;
  value?: RawCarrier;
  item?: RawCarrier;
  raw?: string;
}>();

const query = ref(".");
const stdout = ref("");
const stderr = ref("");
const isCompact = ref(true);
const isRaw = ref(true);
const keysOnly = ref(false);
const filterNulls = ref(false);
const isLoading = ref(false);
const showDebug = ref(false);

const STORAGE_KEY = "jq-plugin-settings";

type RunMeta = {
  query: string;
  flags: string[];
  durationMs: number;
  exitCode: number;
  stdoutLen: number;
  stderrLen: number;
};

const lastRun = ref<RunMeta | null>(null);

type GraphqlFetchState = {
  tried: boolean;
  ok: boolean;
  kind: "request" | "response" | null;
  id: string | null;
  error: string | null;
  rawLength: number;
};

const graphqlFetch = ref<GraphqlFetchState>({
  tried: false,
  ok: false,
  kind: null,
  id: null,
  error: null,
  rawLength: 0,
});

const rawCandidates = computed<Record<string, string | undefined>>(() => ({
  raw: (props as any).raw,
  data: (props as any).data?.raw,
  request: (props as any).request?.raw,
  response: (props as any).response?.raw,
  value: (props as any).value?.raw,
  item: (props as any).item?.raw,
}));

const rawInfo = computed(() => {
  for (const [source, raw] of Object.entries(rawCandidates.value)) {
    if (typeof raw === "string" && raw.length > 0) {
      return { raw, source };
    }
  }
  return { raw: "", source: "" };
});

const idCandidates = computed<Record<string, string | undefined>>(() => ({
  request: (props as any).request?.id,
  response: (props as any).response?.id,
  data: (props as any).data?.id,
  value: (props as any).value?.id,
  item: (props as any).item?.id,
}));

const selectedIds = computed(() => {
  const requestId = Object.values({
    request: idCandidates.value.request,
    data: idCandidates.value.data,
    value: idCandidates.value.value,
    item: idCandidates.value.item,
  }).find((v) => typeof v === "string" && v.length > 0);

  const responseId = Object.values({ response: idCandidates.value.response }).find(
    (v) => typeof v === "string" && v.length > 0,
  );

  return {
    requestId: (requestId as string | undefined) ?? null,
    responseId: (responseId as string | undefined) ?? null,
  };
});

function extractBodyText(raw: string): string {
  if (!raw) return "";

  if (raw.includes("\r\n\r\n") || raw.includes("\n\n")) {
    const separator = raw.includes("\r\n\r\n") ? "\r\n\r\n" : "\n\n";
    const parts = raw.split(separator);
    if (parts.length < 2) return "";
    return parts.slice(1).join(separator).trim();
  }

  return raw.trim();
}

function safePreview(text: string, max = 500): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n...[truncated ${text.length - max} chars]`;
}

const bodyText = computed(() => extractBodyText(rawInfo.value.raw));

const bodyParse = computed(() => {
  const text = bodyText.value;
  if (!text) {
    return { ok: false, type: "(empty)", valuePreview: "" };
  }
  try {
    const value = JSON.parse(text);
    const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    const valuePreview = safePreview(JSON.stringify(value, null, 2), 500);
    return { ok: true, type, valuePreview };
  } catch {
    return { ok: false, type: "(parse_error)", valuePreview: safePreview(text, 500) };
  }
});

const highlightedOutput = computed(() => {
  if (!stdout.value) return "";
  try {
    return Prism.highlight(stdout.value, Prism.languages.json, "json");
  } catch {
    return stdout.value;
  }
});

const debugInfo = computed(() => {
  const keys = Object.keys(props as any);
  const candidateLengths = Object.fromEntries(
    Object.entries(rawCandidates.value).map(([k, v]) => [k, typeof v === "string" ? v.length : 0]),
  );

  return {
    rawSource: rawInfo.value.source || "(none)",
    rawLength: rawInfo.value.raw ? rawInfo.value.raw.length : 0,
    candidateLengths,
    ids: selectedIds.value,
    bodyLength: bodyText.value.length,
    bodyParseOk: bodyParse.value.ok,
    bodyType: bodyParse.value.type,
    bodyPreview: bodyParse.value.valuePreview,
    lastRun: lastRun.value,
    graphqlFetch: graphqlFetch.value,
    keys,
  };
});

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const settings = JSON.parse(raw);
    if (settings?.query) query.value = String(settings.query);
    if (settings?.isCompact !== undefined) isCompact.value = !!settings.isCompact;
    if (settings?.isRaw !== undefined) isRaw.value = !!settings.isRaw;
    if (settings?.keysOnly !== undefined) keysOnly.value = !!settings.keysOnly;
    if (settings?.filterNulls !== undefined) filterNulls.value = !!settings.filterNulls;
  } catch (e) {
    console.error("JQ: Failed to load settings", e);
  }
};

const saveSettings = () => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        query: query.value,
        isCompact: isCompact.value,
        isRaw: isRaw.value,
        keysOnly: keysOnly.value,
        filterNulls: filterNulls.value,
      }),
    );
  } catch (e) {
    console.error("JQ: Failed to save settings", e);
  }
};

const executeJq = async () => {
  let raw = rawInfo.value.raw;

  stderr.value = "";

  if (!raw) {
    stdout.value = "";
    stderr.value = "Error: No raw content provided to this view mode. Enable Debug to inspect received props.";
    return;
  }

  let jsonBody = extractJsonBody(raw);

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
          raw = fullRaw;
          graphqlFetch.value.ok = true;
          graphqlFetch.value.rawLength = fullRaw.length;
          jsonBody = extractJsonBody(fullRaw);
        }
      } else if (caido && responseId) {
        graphqlFetch.value.kind = "response";
        graphqlFetch.value.id = responseId;
        const res = await caido.graphql.response({ id: responseId });
        const fullRaw = res?.response?.raw;
        if (typeof fullRaw === "string" && fullRaw.length > 0) {
          raw = fullRaw;
          graphqlFetch.value.ok = true;
          graphqlFetch.value.rawLength = fullRaw.length;
          jsonBody = extractJsonBody(fullRaw);
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

  const started = performance.now?.() ?? Date.now();
  const result = await runJq(jsonBody, effectiveQuery, flags);
  const ended = performance.now?.() ?? Date.now();

  stdout.value = result.stdout;
  stderr.value =
    result.stderr ||
    (result.timedOut ? "Error: jq-wasm timed out (likely wasm failed to load in Caido)" : "") ||
    (result.exitCode !== 0 ? `Error: jq exited with code ${result.exitCode}` : "");
  isLoading.value = false;

  lastRun.value = {
    query: query.value,
    flags,
    durationMs: Math.max(0, Math.round(ended - started)),
    exitCode: result.exitCode,
    stdoutLen: result.stdout.length,
    stderrLen: result.stderr.length,
  };

  saveSettings();
};

onMounted(() => {
  loadSettings();
  void executeJq();
});

watch([() => rawInfo.value.raw, isCompact, isRaw, keysOnly, filterNulls], () => {
  void executeJq();
});

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

// Avoid v-model directives entirely (they seem to not bind in Caido view modes on some setups).
const onQueryInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  query.value = target.value;
};

const onCompactChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  isCompact.value = target.checked;
};

const onRawChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  isRaw.value = target.checked;
};

const onKeysOnlyChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  keysOnly.value = target.checked;
};

const onFilterNullsChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  filterNulls.value = target.checked;
};

const onDebugChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  showDebug.value = target.checked;
};

const copyDebug = async () => {
  const text = JSON.stringify(debugInfo.value, null, 2);

  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Fallback for environments where clipboard API is blocked.
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    } catch {
      // ignore
    }
  }
};
</script>

<template>
  <div class="jq-view-container flex flex-col h-full p-4 gap-4 overflow-hidden">
    <div class="flex items-center gap-2">
      <input 
        :value="query"
        @input="onQueryInput"
        @keydown.enter="executeJq"
        placeholder="Enter jq query (e.g. .foo[0])"
        class="flex-1 bg-transparent border border-white/10 rounded px-3 py-1 text-sm focus:outline-none focus:border-white/30"
      />
      <button 
        @click="executeJq"
        :disabled="isLoading"
        class="px-4 py-1 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors"
      >
        Filter
      </button>
      <button 
        @click="copyToClipboard(query)"
        class="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors"
      >
        Copy Query
      </button>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" :checked="isCompact" @change="onCompactChange" class="rounded bg-transparent border-white/10" />
        Compact
      </label>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" :checked="isRaw" @change="onRawChange" class="rounded bg-transparent border-white/10" />
        Raw
      </label>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" :checked="keysOnly" @change="onKeysOnlyChange" class="rounded bg-transparent border-white/10" />
        Keys
      </label>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" :checked="filterNulls" @change="onFilterNullsChange" class="rounded bg-transparent border-white/10" />
        No Nulls
      </label>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" :checked="showDebug" @change="onDebugChange" class="rounded bg-transparent border-white/10" />
        Debug
      </label>
    </div>

    <div class="flex-1 flex flex-col min-h-0 gap-2">
      <div
        v-if="showDebug"
        class="p-3 bg-white/5 border border-white/10 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-40 relative"
      >
        <button
          @click="copyDebug"
          class="absolute top-2 right-2 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 transition-all font-sans"
        >
          Copy Debug
        </button>
        {{ JSON.stringify(debugInfo, null, 2) }}
      </div>
      <div v-if="stderr" class="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-200 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32">
        {{ stderr }}
      </div>
      
      <div class="flex-1 relative min-h-0 bg-black/20 border border-white/5 rounded overflow-hidden flex flex-col">
        <div class="absolute top-2 right-2 flex gap-2 z-10">
          <button 
            @click="copyToClipboard(stdout)"
            v-if="stdout"
            class="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 transition-all"
          >
            Copy Output
          </button>
        </div>
        <pre class="flex-1 p-4 m-0 overflow-auto text-sm font-mono whitespace-pre-wrap selection:bg-white/10 language-json"><code v-html="highlightedOutput || (isLoading ? 'Processing...' : 'No output')"></code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jq-view-container {
  background-color: transparent;
  color: var(--color-foreground, #fff);
}

pre {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

/* Prism Dark Theme overrides for Caido */
:deep(.token.property) { color: #9cdcfe; }
:deep(.token.string) { color: #ce9178; }
:deep(.token.number) { color: #b5cea8; }
:deep(.token.boolean) { color: #569cd6; }
:deep(.token.null) { color: #569cd6; }
:deep(.token.operator) { color: #d4d4d4; }
:deep(.token.punctuation) { color: #d4d4d4; }
</style>
