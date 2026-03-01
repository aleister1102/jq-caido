import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import JqOutputPanel from "../JqOutputPanel.vue";

describe("JqOutputPanel", () => {
    it("renders truncated info message and button when truncated", () => {
        const wrapper = mount(JqOutputPanel, {
            props: {
                stdout: "a".repeat(600 * 1024),
                displayOutput: "truncated info",
                shouldHighlight: false,
                isOutputTruncated: true,
                showFullOutput: false,
                isLoading: false,
            },
        });

        expect(wrapper.text()).toContain("Show Full Output");
        expect(wrapper.html()).toContain("truncated info");
    });

    it("renders Show Truncated when showFullOutput is true", () => {
        const wrapper = mount(JqOutputPanel, {
            props: {
                stdout: "a".repeat(600 * 1024),
                displayOutput: "full text",
                shouldHighlight: false,
                isOutputTruncated: false,
                showFullOutput: true,
                isLoading: false,
            },
        });

        expect(wrapper.text()).toContain("Show Truncated");
    });
});
