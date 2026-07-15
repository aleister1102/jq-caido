<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useSettings } from "../composables/useSettings";
import {
  useRawPayload,
  type PropsShape,
} from "../composables/useRawPayload";
import { useJqRunner } from "../composables/useJqRunner";
import { useOutputDisplay } from "../composables/useOutputDisplay";
import { copyToClipboard } from "../lib/clipboard";
import JqQueryInput from "../components/JqQueryInput.vue";
import JqOutputPanel from "../components/JqOutputPanel.vue";

const props = defineProps<PropsShape>();

const { isCompact, isRaw, keysOnly, filterNulls, loadSettings, saveSettings } =
  useSettings();

// Query is intentionally not persisted - always starts fresh with the identity filter.
const query = ref(".");

// Load persisted toggle settings before useJqRunner sets up its watchers.
loadSettings();

const {
  bodyText,
  bodyBytes,
  bodyByteLength,
  parsedJson,
  isOversized,
  autocompleteWarning,
  ensureParsedJson,
} = useRawPayload(computed(() => props));

const {
  result,
  stdout,
  stderr,
  isLoading,
  canRun,
  requiresManualRun,
  enginePreference,
  nativeAvailability,
  executeJq: executeJqInternal,
} = useJqRunner(
  bodyText,
  bodyBytes,
  bodyByteLength,
  query,
  isCompact,
  isRaw,
  keysOnly,
  filterNulls,
  isOversized,
);

const outputDisplay = useOutputDisplay(
  stdout,
  computed(() => result.value?.stdoutBytes ?? 0),
);

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

// Save settings only when the persisted flags change
watch([isCompact, isRaw, keysOnly, filterNulls], () => {
  saveSettings();
});

const engineOptions = [
  { label: "Automatic", value: "automatic" },
  { label: "jq-wasm", value: "jq-wasm" },
  { label: "Native jq", value: "native" },
] as const;

const activeNativeReason = computed(() => {
  if (enginePreference.value !== "native" || nativeAvailability.value.available) {
    return "";
  }
  return nativeAvailability.value.reason ?? "Native jq is unavailable on the Caido backend host.";
});

const statusPanelClass = computed(() => {
  if (result.value?.exitCode === 0) {
    return "bg-amber-900/20 border-amber-500/30 text-amber-200";
  }
  if (result.value && result.value.exitCode !== 0) {
    return "bg-red-900/20 border-red-500/30 text-red-200";
  }
  return "bg-white/5 border-white/10 text-white/80";
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
    <div class="flex flex-col gap-2">
      <div class="jq-query-row flex items-center gap-2">
        <JqQueryInput
          v-model="query"
          :rootJson="parsedJson"
          :autocompleteWarning="autocompleteWarning"
          @requestAutocomplete="requestAutocomplete"
          @submit="executeJq"
          placeholder="Enter jq query (e.g. .foo[0])"
        />
      </div>
      <div class="jq-controls-row flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="px-3 py-1 bg-white/10 hover:bg-white/15 rounded text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!canRun || isLoading"
          @click="executeJq"
        >
          {{ isLoading ? "Running..." : "Run" }}
        </button>
        <button
          @click="handleCopyQuery"
          class="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors"
        >
          {{ queryCopied ? "✓ Copied" : "Copy Query" }}
        </button>
        <div class="flex items-center rounded border border-white/10 overflow-hidden">
          <button
            v-for="option in engineOptions"
            :key="option.value"
            type="button"
            class="px-3 py-1 text-xs transition-colors border-r border-white/10 last:border-r-0"
            :class="enginePreference === option.value ? 'bg-white/15 text-white' : 'bg-transparent text-white/70 hover:bg-white/5'"
            :title="option.value === 'native' ? activeNativeReason : ''"
            @click="enginePreference = option.value"
          >
            {{ option.label }}
          </button>
        </div>
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
    </div>

    <div class="flex-1 flex flex-col min-h-0 gap-2">
      <div
        v-if="stderr"
        data-testid="jq-status-panel"
        :class="[
          'p-3 border rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32',
          statusPanelClass,
        ]"
      >
        {{ stderr }}
      </div>

      <JqOutputPanel
        :stdout="stdout"
        :displayOutput="outputDisplay.displayOutput.value"
        :shouldHighlight="outputDisplay.shouldHighlight.value"
        :enginePreference="enginePreference"
        :resultEngine="result?.engine ?? null"
        :resultHost="result?.host ?? null"
        :inputBytes="result?.inputBytes ?? bodyByteLength"
        :stdoutBytes="result?.stdoutBytes ?? 0"
        :durationMs="result?.durationMs ?? 0"
        :isOutputTruncated="result?.stdoutTruncated ?? false"
        :isStderrTruncated="result?.stderrTruncated ?? false"
        :isLoading="isLoading"
        :outputCopied="outputCopied"
        :hasRun="result !== null"
        :requiresManualRun="requiresManualRun"
        :outputStatus="outputDisplay.statusMessage.value"
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
