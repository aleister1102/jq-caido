<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useSettings } from "../composables/useSettings";
import { useRawPayload, type PropsShape } from "../composables/useRawPayload";
import { useJqRunner } from "../composables/useJqRunner";
import { useOutputDisplay } from "../composables/useOutputDisplay";
import { copyToClipboard } from "../lib/clipboard";
import JqQueryInput from "../components/JqQueryInput.vue";
import JqDebugPanel from "../components/JqDebugPanel.vue";
import JqOutputPanel from "../components/JqOutputPanel.vue";

const props = defineProps<PropsShape>();

const {
  isCompact,
  isRaw,
  keysOnly,
  filterNulls,
  showDebug,
  loadSettings,
  saveSettings,
} = useSettings();

// Query is intentionally not persisted — always starts fresh with the identity filter.
const query = ref(".");

// Load persisted toggle settings before useJqRunner sets up its watchers.
loadSettings();

const {
  rawCandidates,
  rawInfo,
  selectedIds,
  bodyText,
  bodyParse,
  parsedJson,
  updateParsedJson,
} = useRawPayload(computed(() => props));

const {
  stdout,
  stderr,
  isLoading,
  lastRun,
  graphqlFetch,
  executeJq: executeJqInternal,
} = useJqRunner(
  rawInfo,
  selectedIds,
  query,
  isCompact,
  isRaw,
  keysOnly,
  filterNulls,
  updateParsedJson,
);

const outputDisplay = useOutputDisplay(stdout);

// Track copied state for Copy Query button with 2-second auto-reset
const queryCopied = ref(false);
let queryCopiedTimeout: ReturnType<typeof setTimeout> | null = null;

const handleCopyQuery = async () => {
  const success = await copyToClipboard(query.value);
  if (success) {
    queryCopied.value = true;
    if (queryCopiedTimeout) clearTimeout(queryCopiedTimeout);
    queryCopiedTimeout = setTimeout(() => {
      queryCopied.value = false;
    }, 2000);
  }
};

// Track copied state for Copy Output button with 2-second auto-reset
const outputCopied = ref(false);
let outputCopiedTimeout: ReturnType<typeof setTimeout> | null = null;

const handleCopyOutput = async () => {
  const success = await copyToClipboard(stdout.value);
  if (success) {
    outputCopied.value = true;
    if (outputCopiedTimeout) clearTimeout(outputCopiedTimeout);
    outputCopiedTimeout = setTimeout(() => {
      outputCopied.value = false;
    }, 2000);
  }
};

declare const __JQ_DEBUG__: boolean;
const isDev = typeof __JQ_DEBUG__ !== "undefined" && __JQ_DEBUG__;

const executeJq = async () => {
  await executeJqInternal();
};

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

// Save settings only when the persisted flags change
watch([isCompact, isRaw, keysOnly, filterNulls], () => {
  saveSettings();
});

onMounted(() => {
  void executeJq();
});

onUnmounted(() => {
  if (queryCopiedTimeout) {
    clearTimeout(queryCopiedTimeout);
    queryCopiedTimeout = null;
  }
  if (outputCopiedTimeout) {
    clearTimeout(outputCopiedTimeout);
    outputCopiedTimeout = null;
  }
});
</script>

<template>
  <div class="jq-view-container flex flex-col p-4 gap-4 overflow-hidden">
    <div class="flex items-center gap-2">
      <JqQueryInput
        v-model="query"
        :rootJson="parsedJson"
        @submit="executeJq"
        placeholder="Enter jq query (e.g. .foo[0])"
      />
      <button
        @click="executeJq"
        :disabled="isLoading"
        class="px-4 py-1 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors"
      >
        Filter
      </button>
      <button
        @click="handleCopyQuery"
        class="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors"
      >
        {{ queryCopied ? "✓ Copied" : "Copy Query" }}
      </button>
      <!-- v-model works correctly with the current Caido SDK (0.x) view mode host.
           Older versions had binding issues requiring explicit :checked + @change;
           revert to that pattern if a future SDK update breaks two-way binding. -->
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" v-model="isCompact" class="rounded bg-transparent border-white/10" />
        Compact
      </label>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" v-model="isRaw" class="rounded bg-transparent border-white/10" />
        Raw
      </label>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" v-model="keysOnly" class="rounded bg-transparent border-white/10" />
        Keys
      </label>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" v-model="filterNulls" class="rounded bg-transparent border-white/10" />
        No Nulls
      </label>
      <label v-if="isDev" class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" v-model="showDebug" class="rounded bg-transparent border-white/10" />
        Debug
      </label>
    </div>

    <div class="flex-1 flex flex-col min-h-0 gap-2">
      <JqDebugPanel v-if="isDev && showDebug" :debugInfo="debugInfo" />
      <div v-if="stderr" class="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-200 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32">
        {{ stderr }}
      </div>

      <JqOutputPanel
        :stdout="stdout"
        :displayOutput="outputDisplay.displayOutput.value"
        :shouldHighlight="outputDisplay.shouldHighlight.value"
        :isOutputTruncated="outputDisplay.isOutputTruncated.value"
        :showFullOutput="outputDisplay.showFullOutput.value"
        :isLoading="isLoading"
        :outputCopied="outputCopied"
        @copy="handleCopyOutput"
        @toggleFullOutput="outputDisplay.showFullOutput.value = !outputDisplay.showFullOutput.value"
      />
    </div>
  </div>
</template>

<style scoped>
.jq-view-container {
  flex: 1 1 0;
  min-height: 0;
  background-color: transparent;
  color: var(--color-foreground, #fff);
}
</style>