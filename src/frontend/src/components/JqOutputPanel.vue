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
      return "Automatic";
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

const modeHeading = computed(() => (props.hasRun ? "Engine" : "Mode"));
const modeValue = computed(() => (props.hasRun ? resultEngineLabel.value : selectedPreferenceLabel.value));

const copyLabel = computed(() => {
  if (props.isOutputTruncated) {
    return props.outputCopied ? "✓ Copied Truncated Output" : "Copy Truncated Output";
  }
  return props.outputCopied ? "✓ Copied" : "Copy Output";
});
</script>

<template>
  <div class="flex-1 relative min-h-0 bg-black/20 border border-white/5 rounded overflow-hidden flex flex-col">
    <div class="px-4 py-2 border-b border-white/5 text-[10px] uppercase tracking-wider text-white/50 flex gap-3 flex-wrap">
      <span>{{ modeHeading }}: {{ modeValue }}</span>
      <span v-if="hasRun && resultHost">Host: {{ resultHost }}</span>
      <span v-if="inputBytes > 0">Input: {{ formatBytes(inputBytes) }}</span>
      <span v-if="hasRun">Output: {{ formatBytes(stdoutBytes) }}</span>
      <span v-if="hasRun">Time: {{ Math.round(durationMs) }} ms</span>
      <span v-if="isOutputTruncated">Truncated</span>
      <span v-if="isStderrTruncated">Stderr truncated</span>
      <span v-if="outputStatus">{{ outputStatus }}</span>
      <span v-if="requiresManualRun && !hasRun">Manual run</span>
    </div>
    <div class="absolute top-12 right-2 flex gap-2 z-10 items-center">
      <button
        v-if="stdout"
        type="button"
        class="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 transition-all"
        @click="emit('copy')"
      >
        {{ copyLabel }}
      </button>
    </div>
    <pre
      :class="[
        'flex-1 p-4 m-0 overflow-auto text-sm font-mono whitespace-pre-wrap',
        shouldHighlight ? 'language-json' : '',
      ]"
    >
      <code v-if="shouldHighlight" v-html="displayOutput || (isLoading ? 'Processing...' : 'No output')"></code>
      <code v-else>{{ displayOutput || (isLoading ? 'Processing...' : 'No output') }}</code>
    </pre>
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
