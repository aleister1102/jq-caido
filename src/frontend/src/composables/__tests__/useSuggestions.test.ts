import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useSuggestions } from "../useSuggestions";

describe("useSuggestions", () => {
    it("should disable suggestions for objects with more than 10000 keys", () => {
        const manyKeys: Record<string, number> = {};
        for (let i = 0; i < 10001; i++) {
            manyKeys[`key${i}`] = i;
        }
        const modelValue = ref("");
        const rootJson = ref(manyKeys);
        const { suggestions } = useSuggestions(modelValue, rootJson);

        // trigger watcher
        rootJson.value = { ...manyKeys }; 
        expect(suggestions.value.length).toBe(0);
    });

    it("should enable suggestions for small objects", () => {
        const smallObject = { foo: "bar" };
        const modelValue = ref(".");
        const rootJson = ref(smallObject);
        const { suggestions } = useSuggestions(modelValue, rootJson);

        // trigger watcher
        rootJson.value = { ...smallObject };
        expect(suggestions.value.length).toBeGreaterThan(0);
    });
});
