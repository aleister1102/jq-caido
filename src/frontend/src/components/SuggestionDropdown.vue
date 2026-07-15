<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { Suggestion } from "../lib/jq-suggestion";

const props = defineProps<{
  suggestions: Suggestion[];
  selectedIndex: number;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "select", suggestion: Suggestion): void;
  (e: "hover", index: number): void;
}>();

const itemRefs = ref<(HTMLElement | null)[]>([]);

watch(() => props.suggestions.length, (len) => {
  itemRefs.value.length = len;
});

watch(
  () => props.selectedIndex,
  async () => {
    if (!props.visible || props.suggestions.length === 0) return;
    await nextTick();
    const selectedElement = itemRefs.value[props.selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  },
);
</script>

<template>
  <div
    v-if="visible && suggestions.length > 0"
    class="absolute left-0 right-0 top-full mt-1 bg-neutral-900 border border-white/10 rounded shadow-xl z-50 max-h-60 overflow-auto"
    style="background-color: #1a1a1a;"
    role="listbox"
  >
    <button
      v-for="(suggestion, index) in suggestions"
      :key="suggestion.text"
      :ref="(el) => { if (el) itemRefs[index] = el as HTMLElement }"
      type="button"
      role="option"
      :aria-selected="index === selectedIndex"
      @click="emit('select', suggestion)"
      @mouseover="emit('hover', index)"
      :class="[
        'px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 transition-colors w-full text-left whitespace-nowrap',
        index === selectedIndex ? 'bg-white/10 text-white' : 'text-white/60'
      ]"
    >
      <span class="min-w-0 flex-1 truncate" :title="suggestion.text">{{ suggestion.text }}</span>
      <span class="text-[10px] uppercase opacity-40 px-1 border border-white/10 rounded shrink-0">
        {{ suggestion.type === 'index' ? 'index' : suggestion.dataType }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.max-h-60::-webkit-scrollbar {
  width: 4px;
}

.max-h-60::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-60::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.max-h-60::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
