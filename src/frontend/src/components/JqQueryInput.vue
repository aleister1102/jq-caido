<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { getSuggestions, type Suggestion } from "../lib/jq-suggestion";

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
const showSuggestions = ref(false);
const selectedIndex = ref(0);
const suggestions = ref<Suggestion[]>([]);

const updateSuggestions = () => {
  if (!props.rootJson) {
    suggestions.value = [];
    return;
  }
  suggestions.value = getSuggestions(props.rootJson, props.modelValue);
  if (selectedIndex.value >= suggestions.value.length) {
    selectedIndex.value = 0;
  }
};

watch(() => props.modelValue, () => {
  updateSuggestions();
});

watch(() => props.rootJson, () => {
  updateSuggestions();
});

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit("update:modelValue", target.value);
  showSuggestions.value = true;
};

const selectSuggestion = (suggestion: Suggestion) => {
  let newQuery = props.modelValue;
  
  // Replace the prefix with the full suggestion
  const lastDot = newQuery.lastIndexOf(".");
  const lastBracket = newQuery.lastIndexOf("[");
  const lastBoundary = Math.max(lastDot, lastBracket);

  if (lastBoundary === -1) {
    newQuery = "." + suggestion.text;
  } else {
    const basePath = newQuery.slice(0, lastBoundary);
    if (suggestion.type === "index") {
      newQuery = basePath + suggestion.text;
    } else {
      newQuery = basePath + "." + suggestion.text;
    }
  }

  emit("update:modelValue", newQuery);
  showSuggestions.value = false;
  inputRef.value?.focus();
};

const onKeyDown = (e: KeyboardEvent) => {
  if (!showSuggestions.value || suggestions.value.length === 0) {
    if (e.key === "Enter") {
      emit("submit");
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        showSuggestions.value = true;
        updateSuggestions();
    }
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length;
      break;
    case "ArrowUp":
      e.preventDefault();
      selectedIndex.value = (selectedIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
      break;
    case "Enter":
    case "Tab":
      e.preventDefault();
      selectSuggestion(suggestions.value[selectedIndex.value]);
      break;
    case "Escape":
      showSuggestions.value = false;
      break;
  }
};

const closeSuggestions = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest(".jq-query-input-container")) {
    showSuggestions.value = false;
  }
};

onMounted(() => {
  window.addEventListener("click", closeSuggestions);
});

onUnmounted(() => {
  window.removeEventListener("click", closeSuggestions);
});
</script>

<template>
  <div class="jq-query-input-container relative flex-1">
    <input
      ref="inputRef"
      :value="modelValue"
      @input="onInput"
      @keydown="onKeyDown"
      @focus="showSuggestions = true"
      :placeholder="placeholder"
      class="w-full bg-transparent border border-white/10 rounded px-3 py-1 text-sm focus:outline-none focus:border-white/30 transition-colors"
    />
    
    <div
      v-if="showSuggestions && suggestions.length > 0"
      class="absolute left-0 right-0 top-full mt-1 bg-neutral-900 border border-white/10 rounded shadow-xl z-50 max-h-60 overflow-auto"
      style="background-color: #1a1a1a;"
    >
      <div
        v-for="(suggestion, index) in suggestions"
        :key="suggestion.text"
        @click="selectSuggestion(suggestion)"
        @mouseover="selectedIndex = index"
        :class="[
          'px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors',
          index === selectedIndex ? 'bg-white/10 text-white' : 'text-white/60'
        ]"
      >
        <span>{{ suggestion.text }}</span>
        <span class="text-[10px] uppercase opacity-40 px-1 border border-white/10 rounded">{{ suggestion.type }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jq-query-input-container {
  font-family: var(--font-mono, monospace);
}

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
