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
    class="jq-suggestions"
    role="listbox"
  >
    <button
      v-for="(suggestion, index) in suggestions"
      :key="suggestion.text"
      :ref="(el) => { if (el) itemRefs[index] = el as HTMLElement }"
      type="button"
      role="option"
      :aria-selected="index === selectedIndex"
      class="jq-suggestion"
      :class="{ 'is-active': index === selectedIndex }"
      @click="emit('select', suggestion)"
      @mouseover="emit('hover', index)"
    >
      <span class="jq-suggestion-text min-w-0 flex-1 truncate" :title="suggestion.text">{{ suggestion.text }}</span>
      <span class="jq-suggestion-type shrink-0">
        {{ suggestion.type === 'index' ? 'index' : suggestion.dataType }}
      </span>
    </button>
  </div>
</template>

<style scoped>
/* Colors and metrics are pinned instead of themed: Caido host styles override utility classes. */
.jq-suggestions {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  z-index: 50;
  margin-top: 4px;
  max-height: 240px;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background-color: #1a1a1a;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.jq-suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: 0;
  background-color: transparent;
  color: rgba(255, 255, 255, 0.62);
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.jq-suggestion.is-active {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.jq-suggestion-type {
  padding: 0 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: rgba(150, 158, 170, 0.9);
  font-size: 11px;
}

.jq-suggestion-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jq-suggestions::-webkit-scrollbar {
  width: 4px;
}

.jq-suggestions::-webkit-scrollbar-track {
  background: transparent;
}

.jq-suggestions::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
</style>
