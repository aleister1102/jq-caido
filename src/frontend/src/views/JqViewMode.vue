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
  contentType,
  isContentBlocked,
  forceParse,
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
} = useJqRunner({
  bodyText,
  bodyBytes,
  bodyByteLength,
  query,
  isCompact,
  isRaw,
  keysOnly,
  filterNulls,
  isOversized,
  isContentBlocked,
});

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
  { label: "jq-wasm", value: "jq-wasm" },
  { label: "Native jq", value: "native" },
] as const;

const activeNativeReason = computed(() => {
  if (enginePreference.value !== "native" || nativeAvailability.value.available) {
    return "";
  }
  return nativeAvailability.value.reason ?? "Native jq is unavailable on the Caido backend host.";
});

const outputPlaceholder = computed(() => {
  if (!bodyText.value) return "This message has no body to query.";
  return "No output";
});

const statusPanelClass = computed(() => {
  if (result.value?.exitCode === 0) {
    return "is-warning";
  }
  if (result.value && result.value.exitCode !== 0) {
    return "is-error";
  }
  return "is-info";
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
  <div class="jq-view-container">
    <div class="jq-toolbar">
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
      <div class="jq-controls-row flex flex-wrap items-center justify-between gap-2">
        <div data-testid="jq-query-actions" class="jq-controls-group">
          <button
            type="button"
            class="jq-button jq-button--primary"
            :disabled="!canRun || isLoading"
            @click="executeJq"
          >
            Run
          </button>
          <button type="button" class="jq-button jq-button--copy-query" @click="handleCopyQuery">
            {{ queryCopied ? "Query copied" : "Copy query" }}
          </button>
          <div data-testid="jq-engine-controls" class="jq-segmented">
            <button
              v-for="option in engineOptions"
              :key="option.value"
              type="button"
              class="jq-segment"
              :class="{ 'is-active': enginePreference === option.value }"
              :title="option.value === 'native' ? activeNativeReason : ''"
              @click="enginePreference = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <!-- v-model works correctly with the current Caido SDK (0.x) view mode host.
             Older versions had binding issues requiring explicit :checked + @change;
             revert to that pattern if a future SDK update breaks two-way binding. -->
        <div data-testid="jq-output-options" class="jq-controls-group">
          <label class="jq-flag" :class="{ 'is-on': isCompact }">
            <input type="checkbox" v-model="isCompact" />
            Compact
          </label>
          <label class="jq-flag" :class="{ 'is-on': isRaw }">
            <input type="checkbox" v-model="isRaw" />
            Raw
          </label>
          <label class="jq-flag" :class="{ 'is-on': keysOnly }">
            <input type="checkbox" v-model="keysOnly" />
            Keys
          </label>
          <label class="jq-flag" :class="{ 'is-on': filterNulls }">
            <input type="checkbox" v-model="filterNulls" />
            No nulls
          </label>
        </div>
      </div>
    </div>

    <div class="jq-output-region">
      <div
        v-if="stderr"
        data-testid="jq-status-panel"
        class="jq-status-panel"
        :class="statusPanelClass"
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
        :placeholder="outputPlaceholder"
        @copy="handleCopyOutput"
      />
    </div>

    <div
      v-if="isContentBlocked"
      data-testid="jq-content-type-notice"
      class="jq-blocked-overlay"
    >
      <div class="jq-blocked-card">
        <p class="jq-blocked-title">Not a JSON body</p>
        <p class="jq-blocked-detail">
          Content-Type: <span class="jq-blocked-mime">{{ contentType }}</span>
        </p>
        <p class="jq-blocked-hint">jq was skipped for this message.</p>
        <button
          type="button"
          data-testid="jq-force-parse"
          class="jq-button jq-button--primary"
          @click="forceParse"
        >
          Parse anyway
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Every color and metric is pinned: Caido host styles win over utility classes. */
.jq-view-container {
  --jq-accent: #3b82f6;
  --jq-accent-hover: #2563eb;
  --jq-surface: rgba(255, 255, 255, 0.05);
  --jq-surface-hover: rgba(255, 255, 255, 0.1);
  --jq-hairline: rgba(255, 255, 255, 0.12);
  --jq-hairline-strong: rgba(255, 255, 255, 0.22);
  --jq-text: rgba(240, 243, 248, 0.92);
  --jq-text-dim: rgba(160, 168, 180, 0.85);
  --jq-lamp-high: #e3a83c;
  --jq-lamp-critical: #e4646e;

  position: relative;
  flex: 1 1 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  overflow: hidden;
  box-sizing: border-box;
  background-color: transparent;
  color: var(--jq-text);
}

.jq-toolbar {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.jq-query-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.jq-controls-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  width: 100%;
}

.jq-controls-group {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.jq-output-region {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Clean, flat, unified button heights and styling - zero gradients */
.jq-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 12px;
  border: 1px solid var(--jq-hairline);
  border-radius: 4px;
  background-color: var(--jq-surface);
  color: var(--jq-text);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.jq-button:hover:not(:disabled) {
  background-color: var(--jq-surface-hover);
  border-color: var(--jq-hairline-strong);
  color: #fff;
}

.jq-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.jq-button--copy-query {
  width: 96px;
  min-width: 96px;
  max-width: 96px;
  padding: 0 6px;
  text-align: center;
}

.jq-button--primary {
  border-color: var(--jq-accent);
  background-color: var(--jq-accent);
  color: #ffffff;
  font-weight: 500;
}

.jq-button--primary:hover:not(:disabled) {
  border-color: var(--jq-accent-hover);
  background-color: var(--jq-accent-hover);
}

.jq-segmented {
  display: inline-flex;
  align-items: stretch;
  height: 26px;
  border: 1px solid var(--jq-hairline);
  border-radius: 4px;
  background-color: var(--jq-surface);
  overflow: hidden;
  box-sizing: border-box;
}

.jq-segment {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 10px;
  border: none;
  border-radius: 0;
  background-color: transparent;
  color: var(--jq-text-dim);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.jq-segment + .jq-segment {
  border-left: 1px solid var(--jq-hairline);
}

.jq-segment:hover {
  background-color: var(--jq-surface-hover);
  color: var(--jq-text);
}

.jq-segment.is-active {
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.jq-flag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--jq-hairline);
  border-radius: 4px;
  background-color: var(--jq-surface);
  color: var(--jq-text-dim);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.jq-flag:hover {
  background-color: var(--jq-surface-hover);
  border-color: var(--jq-hairline-strong);
  color: #fff;
}

.jq-flag.is-on {
  border-color: rgba(59, 130, 246, 0.5);
  color: var(--jq-text);
}

.jq-flag input {
  width: 12px;
  height: 12px;
  margin: 0;
  accent-color: var(--jq-accent);
  cursor: pointer;
}


.jq-button:focus-visible,
.jq-segment:focus-visible,
.jq-flag:focus-within {
  outline: 2px solid rgba(76, 126, 243, 0.65);
  outline-offset: 1px;
}

.jq-status-panel {
  flex: 0 0 auto;
  max-height: 120px;
  padding: 8px 10px;
  border: 1px solid var(--jq-hairline);
  border-radius: 6px;
  overflow: auto;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.jq-status-panel::selection,
.jq-status-panel *::selection {
  background-color: rgba(228, 100, 110, 0.4);
}
.jq-status-panel.is-info {
  background-color: rgba(255, 255, 255, 0.05);
  color: rgba(233, 236, 242, 0.8);
}

.jq-status-panel.is-warning {
  border-color: rgba(227, 168, 60, 0.4);
  background-color: rgba(227, 168, 60, 0.1);
  color: var(--jq-lamp-high);
}

.jq-status-panel.is-error {
  border-color: rgba(228, 100, 110, 0.4);
  background-color: rgba(228, 100, 110, 0.1);
  color: var(--jq-lamp-critical);
}

.jq-blocked-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: rgba(12, 13, 16, 0.9);
  backdrop-filter: blur(2px);
}

.jq-blocked-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  max-width: 380px;
  padding: 20px 24px;
  border: 1px solid var(--jq-hairline);
  border-radius: 10px;
  background-color: rgba(24, 26, 31, 0.98);
  text-align: center;
}

.jq-blocked-title {
  margin: 0;
  color: var(--jq-text);
  font-size: 15px;
  font-weight: 600;
}

.jq-blocked-detail {
  margin: 0;
  color: rgba(233, 236, 242, 0.7);
  font-size: 13px;
}

.jq-blocked-mime {
  color: var(--jq-lamp-high);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
}

.jq-blocked-hint {
  margin: 0;
  color: var(--jq-text-dim);
  font-size: 12px;
}

.jq-blocked-card .jq-button {
  margin-top: 8px;
}

@media (prefers-reduced-motion: reduce) {
  .jq-button,
  .jq-segment,
  .jq-flag {
    transition: none;
  }
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
