import { ref, watch, type Ref, type ComputedRef } from "vue";
import { getSuggestions, type Suggestion } from "../lib/jq-suggestion";

export function useSuggestions(
  modelValue: Ref<string> | ComputedRef<string>,
  rootJson: Ref<any> | ComputedRef<any>,
) {
  const showSuggestions = ref(false);
  const selectedIndex = ref(0);
  const suggestions = ref<Suggestion[]>([]);

  const updateSuggestions = () => {
    if (!rootJson.value) { suggestions.value = []; return; }
    suggestions.value = getSuggestions(rootJson.value, modelValue.value);
    if (selectedIndex.value >= suggestions.value.length) selectedIndex.value = 0;
  };

  watch([() => modelValue.value, () => rootJson.value], updateSuggestions);

  const selectSuggestion = (suggestion: Suggestion): string => {
    const q = modelValue.value;
    const lastBoundary = Math.max(q.lastIndexOf("."), q.lastIndexOf("["));
    let newQuery: string;
    if (lastBoundary === -1) {
      newQuery = "." + suggestion.text;
    } else {
      const base = q.slice(0, lastBoundary);
      newQuery = suggestion.type === "index" ? base + suggestion.text : base + "." + suggestion.text;
    }
    showSuggestions.value = false;
    return newQuery;
  };

  const navigateUp = () => {
    if (suggestions.value.length) selectedIndex.value = (selectedIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
  };

  const navigateDown = () => {
    if (suggestions.value.length) selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length;
  };

  const setSelectedIndex = (index: number) => { selectedIndex.value = index; };

  const show = () => { showSuggestions.value = true; updateSuggestions(); };
  const hide = () => { showSuggestions.value = false; };

  return { showSuggestions, selectedIndex, suggestions, selectSuggestion, navigateUp, navigateDown, setSelectedIndex, show, hide };
}
