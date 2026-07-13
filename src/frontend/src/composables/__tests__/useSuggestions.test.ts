import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useSuggestions } from "../useSuggestions";

describe("useSuggestions", () => {
    it("returns no suggestions when root json is missing", () => {
        const modelValue = ref("");
        const rootJson = ref<unknown>(null);
        const { suggestions } = useSuggestions(modelValue, rootJson);

        expect(suggestions.value.length).toBe(0);
    });

    it("returns suggestions for small objects", () => {
        const smallObject = { foo: "bar" };
        const modelValue = ref(".");
        const rootJson = ref(smallObject);
        const { suggestions } = useSuggestions(modelValue, rootJson);

        rootJson.value = { ...smallObject };
        expect(suggestions.value.length).toBeGreaterThan(0);
    });
});
