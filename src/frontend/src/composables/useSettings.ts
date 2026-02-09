import { ref } from "vue";

const STORAGE_KEY = "jq-plugin-settings";

export function useSettings() {
  const isCompact = ref(true);
  const isRaw = ref(true);
  const keysOnly = ref(false);
  const filterNulls = ref(false);
  const showDebug = ref(false);

  const loadSettings = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const settings = JSON.parse(raw);
      if (settings?.isCompact !== undefined) isCompact.value = !!settings.isCompact;
      if (settings?.isRaw !== undefined) isRaw.value = !!settings.isRaw;
      if (settings?.keysOnly !== undefined) keysOnly.value = !!settings.keysOnly;
      if (settings?.filterNulls !== undefined) filterNulls.value = !!settings.filterNulls;
    } catch (e) {
      console.error("JQ: Failed to load settings", e);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isCompact: isCompact.value,
          isRaw: isRaw.value,
          keysOnly: keysOnly.value,
          filterNulls: filterNulls.value,
        }),
      );
    } catch (e) {
      console.error("JQ: Failed to save settings", e);
    }
  };

  return {
    isCompact,
    isRaw,
    keysOnly,
    filterNulls,
    showDebug,
    loadSettings,
    saveSettings,
  };
}
