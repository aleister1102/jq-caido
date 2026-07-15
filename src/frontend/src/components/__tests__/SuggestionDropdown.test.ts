import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import SuggestionDropdown from "../SuggestionDropdown.vue";
import type { Suggestion } from "../../lib/jq-suggestion";

describe("SuggestionDropdown", () => {
  const suggestion: Suggestion = {
    text: "payload.with.a.very.long.and.complicated.path.name",
    type: "property",
    dataType: "string",
  };

  it("shows the property text in tooltip and keeps layout classes", () => {
    const wrapper = mount(SuggestionDropdown, {
      props: {
        suggestions: [suggestion],
        selectedIndex: 0,
        visible: true,
      },
    });

    const button = wrapper.get("button");
    const spans = button.findAll("span");

    expect(spans[0].attributes("title")).toBe(suggestion.text);
    expect(spans[0].classes()).toContain("truncate");
    expect(spans[0].classes()).toContain("min-w-0");
    expect(spans[1].classes()).toContain("shrink-0");
  });
});
