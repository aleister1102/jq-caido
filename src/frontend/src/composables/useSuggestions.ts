import { ref, watch, type Ref, type ComputedRef } from "vue";
import { getSuggestions, type Suggestion } from "../lib/jq-suggestion";


export function useSuggestions(
  modelValue: Ref<string> | ComputedRef<string>,
  rootJson: Ref<any> | ComputedRef<any>,
) {
  const showSuggestions = ref(false);
  const selectedIndex = ref(0);
  const suggestions = ref<Suggestion[]>([]);
  const tooLargeForSuggestions = ref(false);

  const isTooLargeForSuggestions = (json: unknown): boolean => {
    if (json == null) return false;
    // Rough estimation if it's already an object
    // For large JSON, we'd rather not stringify it just to check length,
    // but the rootJson in useRawPayload is already gated by 5MB string length.
    // Let's use a heuristic: if we have more than 10,000 keys at root, it's probably too slow.
    if (typeof json === "object" && !Array.isArray(json)) {
      return Object.keys(json as Record<string, unknown>).length > 10000;
    }
    return false;
  };

  const updateSuggestions = () => {
    if (!rootJson.value) {
      suggestions.value = [];
      return;
    }

    if (tooLargeForSuggestions.value) {
      suggestions.value = [];
      return;
    }

    suggestions.value = getSuggestions(rootJson.value, modelValue.value);
    if (selectedIndex.value >= suggestions.value.length) selectedIndex.value = 0;
  };

  tooLargeForSuggestions.value = isTooLargeForSuggestions(rootJson.value);

  updateSuggestions(); // initialize

  watch(() => modelValue.value, () => {
    updateSuggestions();
  });

  watch(() => rootJson.value, () => {
    tooLargeForSuggestions.value = isTooLargeForSuggestions(rootJson.value);
    updateSuggestions();
  });

  const buildQueryFromSuggestion = (currentQuery: string, suggestion: Suggestion): string => {
    let newQuery = currentQuery;

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

    return newQuery;
  };

  const selectSuggestion = (suggestion: Suggestion): string => {
    const newQuery = buildQueryFromSuggestion(modelValue.value, suggestion);
    showSuggestions.value = false;
    return newQuery;
  };

  const navigateUp = () => {
    if (suggestions.value.length === 0) return;
    selectedIndex.value = (selectedIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
  };

  const navigateDown = () => {
    if (suggestions.value.length === 0) return;
    selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length;
  };

  const setSelectedIndex = (index: number) => { selectedIndex.value = index; };

  const show = () => {
    showSuggestions.value = true;
    updateSuggestions();
  };

  const hide = () => {
    showSuggestions.value = false;
  };

  return {
    showSuggestions,
    selectedIndex,
    suggestions,
    selectSuggestion,
    navigateUp,
    navigateDown,
    setSelectedIndex,
    show,
    hide,
  };
}