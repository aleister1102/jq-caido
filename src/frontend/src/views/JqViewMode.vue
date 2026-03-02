<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useSettings } from "../composables/useSettings";
import { useRawPayload, type PropsShape } from "../composables/useRawPayload";
import { useJqRunner } from "../composables/useJqRunner";
import { useOutputDisplay } from "../composables/useOutputDisplay";
import { copyToClipboard } from "../lib/clipboard";
import JqQueryInput from "../components/JqQueryInput.vue";
import JqOutputPanel from "../components/JqOutputPanel.vue";

const props = defineProps<PropsShape>();

const {
  isCompact,
  isRaw,
  keysOnly,
  filterNulls,
  loadSettings,
  saveSettings,
} = useSettings();

// Query is intentionally not persisted — always starts fresh with the identity filter.
const query = ref(".");

// Load persisted toggle settings before useJqRunner sets up its watchers.
loadSettings();

const {
  rawInfo,
  selectedIds,
  parsedJson,
  updateParsedJson,
} = useRawPayload(computed(() => props));

const {
  stdout,
  stderr,
  isLoading,
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

const executeJq = async () => {
  await executeJqInternal();
};

// Save settings only when the persisted flags change
watch([isCompact, isRaw, keysOnly, filterNulls], () => {
  saveSettings();
});

onMounted(() => {
  void executeJq();
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
        @click="copyToClipboard(query)"
        class="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors"
      >
        Copy Query
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
    </div>

    <div class="flex-1 flex flex-col min-h-0 gap-2">
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
        @copy="copyToClipboard(stdout)"
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