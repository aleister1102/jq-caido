<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useSettings } from "../composables/useSettings";
import {
  useRawPayload,
  type PropsShape,
  LARGE_PAYLOAD_THRESHOLD_BYTES,
} from "../composables/useRawPayload";
import { useJqRunner } from "../composables/useJqRunner";
import { useOutputDisplay } from "../composables/useOutputDisplay";
import { copyToClipboard } from "../lib/clipboard";
import JqQueryInput from "../components/JqQueryInput.vue";
import JqOutputPanel from "../components/JqOutputPanel.vue";

const props = defineProps<PropsShape>();

const { isCompact, isRaw, keysOnly, filterNulls, loadSettings, saveSettings } =
  useSettings();

// Query is intentionally not persisted — always starts fresh with the identity filter.
const query = ref(".");

// Load persisted toggle settings before useJqRunner sets up its watchers.
loadSettings();

const {
  bodyText,
  parsedJson,
  isOversized,
  isLargePayload,
  autocompleteWarning,
  ensureParsedJson,
  clearParsedJson,
} = useRawPayload(computed(() => props));

const {
  stdout,
  stderr,
  isLoading,
  executeJq: executeJqInternal,
} = useJqRunner(
  bodyText,
  query,
  isCompact,
  isRaw,
  keysOnly,
  filterNulls,
  isOversized,
  isLargePayload,
  clearParsedJson,
);

const noNullsWarning = computed(() => {
  if (!filterNulls.value || !isLargePayload.value) return "";
  return `No Nulls is disabled for payloads over ${Math.round(LARGE_PAYLOAD_THRESHOLD_BYTES / 1_000_000)} MB to keep queries responsive.`;
});

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
const executeJq = async () => {
  await executeJqInternal();
};

const requestAutocomplete = () => {
  ensureParsedJson();
};

watch(
  () => bodyText.value,
  () => {
    clearParsedJson();
  },
);

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
        :autocompleteWarning="autocompleteWarning"
        @requestAutocomplete="requestAutocomplete"
        @submit="executeJq"
        placeholder="Enter jq query (e.g. .foo[0])"
      />
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
        <input
          type="checkbox"
          v-model="isCompact"
          class="rounded bg-transparent border-white/10"
        />
        Compact
      </label>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          v-model="isRaw"
          class="rounded bg-transparent border-white/10"
        />
        Raw
      </label>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          v-model="keysOnly"
          class="rounded bg-transparent border-white/10"
        />
        Keys
      </label>
      <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          v-model="filterNulls"
          class="rounded bg-transparent border-white/10"
        />
        No Nulls
      </label>
    </div>

    <div v-if="noNullsWarning" class="text-xs text-white/60 -mt-2">
      {{ noNullsWarning }}
    </div>

    <div class="flex-1 flex flex-col min-h-0 gap-2">
      <div
        v-if="stderr"
        class="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-200 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32"
      >
        {{ stderr }}
      </div>

      <JqOutputPanel
        :stdout="stdout"
        :displayOutput="outputDisplay.displayOutput.value"
        :shouldHighlight="outputDisplay.shouldHighlight.value"
        :isHighlighting="outputDisplay.isHighlighting.value"
        :isOutputTruncated="outputDisplay.isOutputTruncated.value"
        :isLoading="isLoading"
        :outputCopied="outputCopied"
        @copy="handleCopyOutput"
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
