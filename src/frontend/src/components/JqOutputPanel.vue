<script setup lang="ts">
defineProps<{
  stdout: string;
  displayOutput: string;
  shouldHighlight: boolean;
  isOutputTruncated: boolean;
  showFullOutput: boolean;
  isLoading: boolean;
  outputCopied: boolean;
}>();

const emit = defineEmits<{
  (e: "copy"): void;
  (e: "toggleFullOutput"): void;
}>();
</script>

<template>
  <div class="flex-1 relative min-h-0 bg-black/20 border border-white/5 rounded overflow-hidden flex flex-col">
    <div class="absolute top-2 right-2 flex gap-2 z-10">
      <button
        v-if="stdout"
        @click="emit('copy')"
        class="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 transition-all"
      >
        {{ outputCopied ? "✓ Copied" : "Copy Output" }}
      </button>
      <button
        v-if="isOutputTruncated || showFullOutput"
        @click="emit('toggleFullOutput')"
        class="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 transition-all"
      >
        {{ showFullOutput ? 'Show Truncated' : 'Show Full Output' }}
      </button>
    </div>
    <pre :class="['flex-1 p-4 m-0 overflow-auto text-sm font-mono whitespace-pre-wrap', shouldHighlight && !isOutputTruncated ? 'language-json' : '']"><code v-html="displayOutput || (isLoading ? 'Processing...' : 'No output')"></code></pre>
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

/* Prism Dark Theme overrides for Caido */
:deep(.token.property) { color: #9cdcfe; }
:deep(.token.string) { color: #ce9178; }
:deep(.token.number) { color: #b5cea8; }
:deep(.token.boolean) { color: #569cd6; }
:deep(.token.null) { color: #569cd6; }
:deep(.token.operator) { color: #d4d4d4; }
:deep(.token.punctuation) { color: #d4d4d4; }
</style>
