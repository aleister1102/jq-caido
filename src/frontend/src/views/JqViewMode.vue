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
  {
    label: "Auto-select",
    value: "automatic",
    title: "Uses Native jq for inputs 10 MB and above when available; otherwise jq-wasm.",
  },
  { label: "jq-wasm", value: "jq-wasm", title: "Runs jq in the browser via WebAssembly." },
  { label: "Native jq", value: "native", title: "Runs jq on the Caido backend host." },
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
  <div class="jq-view-container flex flex-col px-4 pt-4 pb-0 gap-4 overflow-hidden">
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
      <div class="jq-controls-row flex flex-wrap items-center gap-x-4 gap-y-2">
        <div data-testid="jq-query-actions" class="flex shrink-0 items-center gap-2">
          <button
            type="button"
            class="jq-run-button px-3 py-1 rounded text-xs transition-colors disabled:cursor-not-allowed"
            :disabled="!canRun || isLoading"
            :aria-busy="isLoading"
            @click="executeJq"
          >
            Run
          </button>
          <button
            type="button"
            @click="handleCopyQuery"
            class="jq-copy-query-button px-3 py-1 rounded text-xs transition-colors"
          >
            {{ queryCopied ? "✓ Copied" : "Copy Query" }}
          </button>
        </div>
        <div data-testid="jq-engine-controls" class="jq-engine-controls flex shrink-0 items-center rounded border overflow-hidden">
          <button
            v-for="option in engineOptions"
            :key="option.value"
            type="button"
            class="jq-engine-button px-3 py-1 text-xs transition-colors"
            :class="{ 'is-active': enginePreference === option.value }"
            :title="option.value === 'native' && activeNativeReason ? activeNativeReason : option.title"
            @click="enginePreference = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <div data-testid="jq-output-options" class="flex flex-wrap items-center gap-2">
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

.jq-run-button {
  background-color: #0369a1;
  color: #f8fafc;
}

.jq-run-button:hover:not(:disabled) {
  background-color: #0284c7;
}

.jq-run-button:disabled {
  opacity: 0.4;
}

.jq-copy-query-button {
  background-color: #334155;
  color: #e2e8f0;
}

.jq-copy-query-button:hover {
  background-color: #475569;
  color: #fff;
}

.jq-engine-controls {
  border-color: rgba(148, 163, 184, 0.28);
  background-color: rgba(15, 23, 42, 0.45);
}

.jq-engine-button {
  border-right: 1px solid rgba(148, 163, 184, 0.22);
  background-color: rgba(51, 65, 85, 0.5);
  color: #cbd5e1;
}

.jq-engine-button:last-child {
  border-right: 0;
}

.jq-engine-button:hover {
  background-color: rgba(71, 85, 105, 0.8);
  color: #fff;
}

.jq-engine-button.is-active {
  background-color: #4338ca;
  color: #fff;
}

.jq-run-button:focus-visible,
.jq-copy-query-button:focus-visible,
.jq-engine-button:focus-visible {
  outline: 2px solid #7dd3fc;
  outline-offset: 2px;
}
</style>
