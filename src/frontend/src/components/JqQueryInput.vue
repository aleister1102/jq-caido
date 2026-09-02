<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSuggestions } from "../composables/useSuggestions";
import SuggestionDropdown from "./SuggestionDropdown.vue";
import type { Suggestion } from "../lib/jq-suggestion";

const props = defineProps<{
  modelValue: string;
  rootJson: any;
  placeholder?: string;
  autocompleteWarning?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "requestAutocomplete"): void;
  (e: "submit"): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const isAutocompleteEnabled = computed(() => !props.autocompleteWarning);

const {
  showSuggestions,
  selectedIndex,
  suggestions,
  selectSuggestion: selectSuggestionInternal,
  navigateUp,
  navigateDown,
  setSelectedIndex,
  show: showSuggestionsDropdown,
  hide: hideSuggestionsDropdown,
} = useSuggestions(
  computed(() => props.modelValue),
  computed(() => props.rootJson),
);

const handleWindowClick = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    hideSuggestionsDropdown();
  }
};

onMounted(() => window.addEventListener("click", handleWindowClick));
onUnmounted(() => window.removeEventListener("click", handleWindowClick));

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit("update:modelValue", target.value);
  if (isAutocompleteEnabled.value) {
    emit("requestAutocomplete");
    showSuggestionsDropdown();
  } else {
    hideSuggestionsDropdown();
  }
};

const onFocus = () => {
  if (isAutocompleteEnabled.value) {
    emit("requestAutocomplete");
    showSuggestionsDropdown();
  }
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
      if (isAutocompleteEnabled.value) {
        emit("requestAutocomplete");
        showSuggestionsDropdown();
      }
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
  <div ref="containerRef" class="jq-query-input-container">
    <input
      ref="inputRef"
      :value="modelValue"
      @input="onInput"
      @keydown="onKeyDown"
      @focus="onFocus"
      :placeholder="placeholder"
      class="jq-query-field"
    />

    <SuggestionDropdown
      :suggestions="suggestions"
      :selectedIndex="selectedIndex"
      :visible="showSuggestions"
      @select="selectSuggestion"
      @hover="setSelectedIndex"
    />

    <div v-if="autocompleteWarning" class="jq-query-warning">
      {{ autocompleteWarning }}
    </div>
  </div>
</template>

<style scoped>
.jq-query-input-container {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  font-family: var(--font-mono, monospace);
}

/* Colors are pinned instead of themed: Caido host styles override utility classes. */
.jq-query-field {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.04);
  color: rgba(233, 236, 242, 0.94);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 14px;
  line-height: 1;
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.jq-query-field::placeholder {
  color: rgba(150, 158, 170, 0.75);
}

.jq-query-field:hover {
  border-color: rgba(255, 255, 255, 0.24);
}

.jq-query-field:focus {
  border-color: rgba(76, 126, 243, 0.8);
  background-color: rgba(255, 255, 255, 0.06);
}

.jq-query-warning {
  margin-top: 4px;
  color: rgba(227, 168, 60, 0.9);
  font-size: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .jq-query-field {
    transition: none;
  }
}
</style>
