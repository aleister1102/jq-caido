<script setup lang="ts">
import { copyToClipboard } from "../lib/clipboard";

defineProps<{
  debugInfo: Record<string, unknown>;
}>();
</script>

<template>
  <div class="p-3 bg-white/5 border border-white/10 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-40 relative">
    <button
      @click="copyToClipboard(JSON.stringify(debugInfo, null, 2))"
      class="absolute top-2 right-2 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 transition-all font-sans"
    >
      Copy Debug
    </button>
    {{ JSON.stringify(debugInfo, null, 2) }}
  </div>
</template>
