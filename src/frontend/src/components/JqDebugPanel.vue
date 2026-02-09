<script setup lang="ts">
const props = defineProps<{
  debugInfo: Record<string, unknown>;
  visible: boolean;
}>();

const copyDebug = async () => {
  const text = JSON.stringify(props.debugInfo, null, 2);

  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Fallback for environments where clipboard API is blocked.
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    } catch (e) {
      console.warn("JQ: clipboard fallback failed", e);
    }
  }
};
</script>

<template>
  <div
    v-if="visible"
    class="p-3 bg-white/5 border border-white/10 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-40 relative"
  >
    <button
      @click="copyDebug"
      class="absolute top-2 right-2 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 transition-all font-sans"
    >
      Copy Debug
    </button>
    {{ JSON.stringify(debugInfo, null, 2) }}
  </div>
</template>
