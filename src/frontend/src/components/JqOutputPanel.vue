<script setup lang="ts">
import { computed } from "vue";
import type { JqEngine, JqEnginePreference, JqHost } from "../../../shared/jqContract";
import { durationLevel, inputByteLevel, outputByteLevel } from "../../../shared/jqPolicy";
import { formatBytes } from "../lib/formatBytes";

const props = withDefaults(defineProps<{
  stdout: string;
  displayOutput: string;
  shouldHighlight: boolean;
  enginePreference: JqEnginePreference;
  resultEngine: JqEngine | null;
  resultHost: JqHost | null;
  inputBytes: number;
  stdoutBytes: number;
  durationMs: number;
  isOutputTruncated: boolean;
  isStderrTruncated: boolean;
  isLoading: boolean;
  outputCopied: boolean;
  hasRun: boolean;
  requiresManualRun: boolean;
  outputStatus: string;
  placeholder?: string;
}>(), {
  placeholder: "No output",
});

const emit = defineEmits<{
  (e: "copy"): void;
}>();


const resultEngineLabel = computed(() => {
  switch (props.resultEngine ?? props.enginePreference) {
    case "native":
      return "Native jq";
    default:
      return "jq-wasm";
  }
});

const hostLabel = computed(() => (props.resultHost === "caido-backend-host" ? "Caido backend" : "Browser"));
const showReadout = computed(() => props.hasRun || props.inputBytes > 0);

const inputLevel = computed(() => `is-${inputByteLevel(props.inputBytes)}`);
const outputLevel = computed(() => `is-${outputByteLevel(props.stdoutBytes)}`);
const timeLevel = computed(() => `is-${durationLevel(props.durationMs)}`);

const copyLabel = computed(() => {
  if (props.isOutputTruncated) {
    return props.outputCopied ? "Copied truncated output" : "Copy truncated output";
  }
  return props.outputCopied ? "Copied" : "Copy output";
});
</script>

<template>
  <div class="jq-output-panel">
    <pre
      v-if="shouldHighlight"
      class="jq-output-body language-json"
      v-html="displayOutput"
    ></pre>
    <pre
      v-else-if="displayOutput"
      class="jq-output-body"
      v-text="displayOutput"
    ></pre>
    <div v-else class="jq-output-empty">
      {{ isLoading ? "Running jq..." : placeholder }}
    </div>

    <div v-if="showReadout" data-testid="jq-output-footer" class="jq-readout items-center">
      <div data-testid="jq-output-stats" class="jq-output-stats">
        <span class="jq-readout-item">
          <span class="jq-readout-label">{{ hasRun ? "Engine" : "Mode" }}</span>
          <span class="jq-readout-value">{{ resultEngineLabel }}</span>
        </span>
        <span v-if="hasRun && resultHost" class="jq-readout-item">
          <span class="jq-readout-label">Host</span>
          <span class="jq-readout-value">{{ hostLabel }}</span>
        </span>
        <span v-if="inputBytes > 0" class="jq-readout-item">
          <span class="jq-readout-label">Input</span>
          <span class="jq-readout-value" :class="inputLevel">{{ formatBytes(inputBytes) }}</span>
        </span>
        <span v-if="hasRun" class="jq-readout-item">
          <span class="jq-readout-label">Output</span>
          <span class="jq-readout-value" :class="outputLevel">{{ formatBytes(stdoutBytes) }}</span>
        </span>
        <span v-if="hasRun" class="jq-readout-item">
          <span class="jq-readout-label">Time</span>
          <span class="jq-readout-value" :class="timeLevel">{{ Math.round(durationMs) }} ms</span>
        </span>
        <span v-if="isOutputTruncated" class="jq-readout-flag is-critical">Output truncated</span>
        <span v-if="isStderrTruncated" class="jq-readout-flag is-high">Stderr truncated</span>
        <span v-if="outputStatus" class="jq-readout-flag is-high">{{ outputStatus }}</span>
        <span v-if="requiresManualRun && !hasRun" class="jq-readout-flag is-high">Manual run</span>
      </div>
      <button
        v-if="stdout"
        type="button"
        class="jq-copy-button jq-copy-output shrink-0"
        @click="emit('copy')"
      >
        {{ copyLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Colors are pinned instead of themed: Caido host styles override utility classes. */
.jq-output-panel {
  --jq-well: rgba(9, 10, 12, 0.35);
  --jq-hairline: rgba(255, 255, 255, 0.09);
  --jq-text: rgba(233, 236, 242, 0.94);
  --jq-label: rgba(150, 158, 170, 0.9);
  --jq-lamp-normal: #57c98a;
  --jq-lamp-high: #e3a83c;
  --jq-lamp-critical: #e4646e;

  position: relative;
  flex: 1 1 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--jq-hairline);
  border-radius: 4px;
  background-color: var(--jq-well);
  overflow: hidden;
  box-sizing: border-box;
}

.jq-output-body {
  flex: 1 1 0;
  width: 100%;
  margin: 0;
  padding: 8px 10px;
  box-sizing: border-box;
  overflow: auto;
  color: var(--jq-text);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 13px;
  line-height: 1.5;
  tab-size: 2;
  white-space: pre-wrap;
  word-break: break-word;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
  user-select: text;
  cursor: text;
}

.jq-output-body::selection,
.jq-output-body *::selection {
  background-color: rgba(76, 126, 243, 0.35);
}

.jq-output-empty {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--jq-label);
  font-size: 13px;
  text-align: center;
}

.jq-readout {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 14px;
  padding: 4px 8px 4px 10px;
  border-top: 1px solid var(--jq-hairline);
  background-color: rgba(255, 255, 255, 0.02);
  font-size: 11px;
}

.jq-output-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
}

.jq-readout-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.jq-readout-label {
  color: var(--jq-label);
}

.jq-readout-value {
  color: var(--jq-text);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-variant-numeric: tabular-nums;
}

.jq-readout-value.is-normal {
  color: var(--jq-lamp-normal);
}

.jq-readout-value.is-high {
  color: var(--jq-lamp-high);
}

.jq-readout-value.is-critical {
  color: var(--jq-lamp-critical);
}

.jq-readout-flag {
  color: var(--jq-lamp-high);
}

.jq-readout-flag.is-critical {
  color: var(--jq-lamp-critical);
}

/* Flat clean button matching toolbar buttons */
.jq-copy-button {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 78px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--jq-hairline);
  border-radius: 5px;
  background-color: var(--jq-surface);
  color: var(--jq-text);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.jq-copy-button:hover {
  background-color: var(--jq-surface-hover);
  border-color: var(--jq-hairline-strong);
  color: #fff;
}
:deep(.token.property) { color: #9ecbff; }
:deep(.token.string) { color: #e8a06a; }
:deep(.token.number) { color: #a8d8a0; }
:deep(.token.boolean) { color: #7fb2f0; }
:deep(.token.null) { color: #7fb2f0; }
:deep(.token.operator) { color: rgba(233, 236, 242, 0.8); }
:deep(.token.punctuation) { color: rgba(233, 236, 242, 0.65); }
</style>
