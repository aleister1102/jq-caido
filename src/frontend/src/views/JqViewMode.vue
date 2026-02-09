<script setup lang="ts">
import { computed, onMounted, type Ref } from "vue";
import { useSettings } from "../composables/useSettings";
import { useRawPayload, type PropsShape } from "../composables/useRawPayload";
import { useJqRunner } from "../composables/useJqRunner";
import { useOutputDisplay } from "../composables/useOutputDisplay";
import { copyToClipboard } from "../lib/clipboard";
import JqQueryInput from "../components/JqQueryInput.vue";
import JqDebugPanel from "../components/JqDebugPanel.vue";
import JqOutputPanel from "../components/JqOutputPanel.vue";

const props = defineProps<PropsShape>();

const { query, isCompact, isRaw, keysOnly, filterNulls, showDebug, loadSettings, saveSettings } = useSettings();
const { rawCandidates, rawInfo, selectedIds, bodyText, bodyParse, parsedJson, updateParsedJson } = useRawPayload(computed(() => props));

const { stdout, stderr, isLoading, lastRun, graphqlFetch, executeJq: executeJqInternal } = useJqRunner(
  rawInfo, selectedIds, query, isCompact, isRaw, keysOnly, filterNulls, updateParsedJson, saveSettings,
);

const { showFullOutput, shouldHighlight, displayOutput, isOutputTruncated } = useOutputDisplay(stdout);

const executeJq = async () => {
  await executeJqInternal();
  showFullOutput.value = false;
};

const toggles: { label: string; ref: Ref<boolean> }[] = [
  { label: "Compact", ref: isCompact },
  { label: "Raw", ref: isRaw },
  { label: "Keys", ref: keysOnly },
  { label: "No Nulls", ref: filterNulls },
  { label: "Debug", ref: showDebug },
];

const debugInfo = computed(() => ({
  rawSource: rawInfo.value.source || "(none)",
  rawLength: rawInfo.value.raw?.length ?? 0,
  candidateLengths: Object.fromEntries(
    Object.entries(rawCandidates.value).map(([k, v]) => [k, typeof v === "string" ? v.length : 0]),
  ),
  ids: selectedIds.value,
  bodyLength: bodyText.value.length,
  bodyParseOk: bodyParse.value.ok,
  bodyType: bodyParse.value.type,
  bodyPreview: bodyParse.value.valuePreview,
  lastRun: lastRun.value,
  graphqlFetch: graphqlFetch.value,
  keys: Object.keys(props as any),
}));

onMounted(() => {
  loadSettings();
  void executeJq();
});
</script>

<template>
  <div class="jq-view-container flex flex-col p-4 gap-4 overflow-hidden">
    <div class="flex items-center gap-2">
      <JqQueryInput v-model="query" :rootJson="parsedJson" @submit="executeJq" placeholder="Enter jq query (e.g. .foo[0])" />
      <button @click="executeJq" :disabled="isLoading" class="px-4 py-1 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors">Filter</button>
      <button @click="copyToClipboard(query)" class="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors">Copy Query</button>
      <label v-for="t in toggles" :key="t.label" class="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" :checked="t.ref.value" @change="t.ref.value = ($event.target as HTMLInputElement).checked" class="rounded bg-transparent border-white/10" />
        {{ t.label }}
      </label>
    </div>

    <div class="flex-1 flex flex-col min-h-0 gap-2">
      <JqDebugPanel :debugInfo="debugInfo" :visible="showDebug" />
      <div v-if="stderr" class="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-200 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32">{{ stderr }}</div>
      <JqOutputPanel
        :stdout="stdout" :displayOutput="displayOutput" :shouldHighlight="shouldHighlight"
        :isOutputTruncated="isOutputTruncated" :showFullOutput="showFullOutput" :isLoading="isLoading"
        @copy="copyToClipboard(stdout)" @toggleFullOutput="showFullOutput = !showFullOutput"
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
