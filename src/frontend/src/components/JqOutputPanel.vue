<script setup lang="ts">
import { computed } from "vue";
import type { JqEngine, JqEnginePreference, JqHost } from "../../../shared/jqContract";
import { formatBytes } from "../lib/formatBytes";

const props = defineProps<{
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
}>();

const emit = defineEmits<{
  (e: "copy"): void;
}>();

const selectedPreferenceLabel = computed(() => {
  switch (props.enginePreference) {
    case "native":
      return "Native jq";
    case "jq-wasm":
      return "jq-wasm";
    default:
      return "Auto-select";
  }
});

const resultEngineLabel = computed(() => {
  switch (props.resultEngine) {
    case "native":
      return "Native jq";
    case "jq-wasm":
      return "jq-wasm";
    default:
      return selectedPreferenceLabel.value;
  }
});

const currentEngineLabel = computed(() => {
  if (props.hasRun) return resultEngineLabel.value;
  return props.isLoading ? "Running" : "Not run";
});

const resultHostLabel = computed(() => {
  switch (props.resultHost) {
    case "browser":
      return "Browser";
    case "caido-backend-host":
      return "Caido backend";
    default:
      return "-";
  }
});

const copyLabel = computed(() => {
  if (props.isOutputTruncated) {
    return props.outputCopied ? "✓ Copied Truncated Output" : "Copy Truncated Output";
  }
  return props.outputCopied ? "✓ Copied" : "Copy Output";
});
</script>

<template>
  <div class="flex-1 min-h-0 bg-black/20 border border-white/5 rounded overflow-hidden flex flex-col">
    <pre
      :class="[
        'flex-1 p-4 m-0 overflow-auto text-sm font-mono whitespace-pre-wrap',
        shouldHighlight ? 'language-json' : '',
      ]"
    ><code v-if="shouldHighlight" v-html="displayOutput || (isLoading ? 'Processing...' : 'No output')"></code><code v-else>{{ displayOutput || (isLoading ? 'Processing...' : 'No output') }}</code></pre>
    <div
      data-testid="jq-output-footer"
      class="px-4 py-2.5 border-t border-white/5 flex items-center justify-between gap-4"
    >
      <div class="min-w-0 flex-1">
        <div data-testid="jq-output-stats" class="jq-output-stats text-white/75">
          <span class="jq-stat">
            <span class="jq-stat-label">Mode:</span>
            <span class="jq-stat-value truncate font-mono" :title="selectedPreferenceLabel">{{ selectedPreferenceLabel }}</span>
          </span>
          <span class="jq-stat">
            <span class="jq-stat-label">Engine:</span>
            <span class="jq-stat-value jq-engine-value truncate font-mono" :title="currentEngineLabel">{{ currentEngineLabel }}</span>
          </span>
          <span class="jq-stat">
            <span class="jq-stat-label">Host:</span>
            <span class="jq-stat-value truncate font-mono" :title="resultHostLabel">{{ resultHostLabel }}</span>
          </span>
          <span class="jq-stat">
            <span class="jq-stat-label">Input:</span>
            <span class="jq-stat-value font-mono tabular-nums">{{ formatBytes(inputBytes) }}</span>
          </span>
          <span class="jq-stat">
            <span class="jq-stat-label">Output:</span>
            <span class="jq-stat-value font-mono tabular-nums">{{ hasRun ? formatBytes(stdoutBytes) : "-" }}</span>
          </span>
          <span class="jq-stat">
            <span class="jq-stat-label">Time:</span>
            <span class="jq-stat-value font-mono tabular-nums">{{ hasRun ? `${Math.round(durationMs)} ms` : "-" }}</span>
          </span>
        </div>
        <div
          v-if="isOutputTruncated || isStderrTruncated || outputStatus || (requiresManualRun && !hasRun)"
          class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-amber-300"
        >
          <span v-if="isOutputTruncated">Truncated</span>
          <span v-if="isStderrTruncated">Stderr truncated</span>
          <span v-if="outputStatus">{{ outputStatus }}</span>
          <span v-if="requiresManualRun && !hasRun">Manual run</span>
        </div>
      </div>
      <button
        v-if="stdout"
        type="button"
        class="jq-copy-output shrink-0 px-2.5 py-1 rounded text-[11px] font-medium text-white transition-colors"
        @click="emit('copy')"
      >
        {{ copyLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
pre {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  user-select: text;
  cursor: text;
}

pre code {
  user-select: text;
}

.jq-output-stats {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  overflow-x: auto;
  font-size: 11px;
  white-space: nowrap;
}

.jq-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  flex: none;
}

.jq-stat-label {
  color: rgba(255, 255, 255, 0.48);
}

.jq-stat-value {
  color: rgba(255, 255, 255, 0.88);
}

.jq-engine-value {
  color: #7dd3fc;
}

.jq-copy-output {
  background-color: #0284c7;
}

.jq-copy-output:hover {
  background-color: #0ea5e9;
}

pre::selection,
pre *::selection {
  background-color: rgba(100, 150, 255, 0.4);
}

:deep(.token.property) { color: #9cdcfe; }
:deep(.token.string) { color: #ce9178; }
:deep(.token.number) { color: #b5cea8; }
:deep(.token.boolean) { color: #569cd6; }
:deep(.token.null) { color: #569cd6; }
:deep(.token.operator) { color: #d4d4d4; }
:deep(.token.punctuation) { color: #d4d4d4; }
</style>
