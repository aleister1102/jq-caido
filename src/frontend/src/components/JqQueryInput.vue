<script setup lang="ts">
import { ref, computed } from "vue";
import { useClickOutside } from "../composables/useClickOutside";
import { useSuggestions } from "../composables/useSuggestions";
import SuggestionDropdown from "./SuggestionDropdown.vue";
import type { Suggestion } from "../lib/jq-suggestion";

const props = defineProps<{
  modelValue: string;
  rootJson: any;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "submit"): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

const {
  showSuggestions,
  selectedIndex,
  suggestions,
  selectSuggestion: selectSuggestionInternal,
  navigateUp,
  navigateDown,
  show: showSuggestionsDropdown,
  hide: hideSuggestionsDropdown,
} = useSuggestions(
  computed(() => props.modelValue),
  computed(() => props.rootJson),
);

useClickOutside(containerRef, () => {
  hideSuggestionsDropdown();
});

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit("update:modelValue", target.value);
  const inputEvent = e as InputEvent;
  if (inputEvent.inputType?.startsWith("delete")) {
    hideSuggestionsDropdown();
    return;
  }
  showSuggestionsDropdown();
};

const selectSuggestion = (suggestion: Suggestion) => {
  const newQuery = selectSuggestionInternal(suggestion);
  emit("update:modelValue", newQuery);
  inputRef.value?.focus();
};

const onKeyDown = (e: KeyboardEvent) => {
  if (!showSuggestions.value || suggestions.value.length === 0) {
    if (e.key === "Enter") {
      emit("submit");
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      showSuggestionsDropdown();
    }
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      navigateDown();
      break;
    case "ArrowUp":
      e.preventDefault();
      navigateUp();
      break;
    case "Enter":
    case "Tab":
      e.preventDefault();
      selectSuggestion(suggestions.value[selectedIndex.value]);
      break;
    case "Escape":
      hideSuggestionsDropdown();
      break;
  }
};
</script>

<template>
  <div ref="containerRef" class="jq-query-input-container relative flex-1">
    <input
      ref="inputRef"
      :value="modelValue"
      @input="onInput"
      @keydown="onKeyDown"
      @focus="showSuggestionsDropdown"
      :placeholder="placeholder"
      class="w-full bg-transparent border border-white/10 rounded px-3 py-1 text-sm focus:outline-none focus:border-white/30 transition-colors"
    />
    
    <SuggestionDropdown
      :suggestions="suggestions"
      :selectedIndex="selectedIndex"
      :visible="showSuggestions"
      @select="selectSuggestion"
      @hover="(index) => selectedIndex = index"
    />
  </div>
</template>

<style scoped>
.jq-query-input-container {
  font-family: var(--font-mono, monospace);
}
</style>
