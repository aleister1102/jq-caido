
import { describe, it, expect } from "vitest";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

describe.skip("Baseline Performance (manual)", () => {
    it("measures escapeHtml for 1MB string", () => {
        const input = "a".repeat(1024 * 1024) + "<script>alert(1)</script>&foo=bar";
        const start = performance.now();
        const output = escapeHtml(input);
        const end = performance.now();
        console.log(`[PERF] escapeHtml 1MB took ${(end - start).toFixed(2)}ms`);
        expect(output).toBeDefined();
    });

    it("measures escapeHtml for 5MB string", () => {
        const input = "a".repeat(5 * 1024 * 1024);
        const start = performance.now();
        const output = escapeHtml(input);
        const end = performance.now();
        console.log(`[PERF] escapeHtml 5MB took ${(end - start).toFixed(2)}ms`);
        expect(output).toBeDefined();
    });

    it("measures JSON.stringify for 1MB data", () => {
        const data = { a: "b".repeat(1024 * 1024) };
        const start = performance.now();
        const s = JSON.stringify(data);
        const end = performance.now();
        console.log(`[PERF] JSON.stringify 1MB took ${(end - start).toFixed(2)}ms`);
        expect(s).toBeDefined();
    });

    it("measures Object.keys for 10000 properties", () => {
        const obj: Record<string, number> = {};
        for (let i = 0; i < 10000; i++) obj[`k${i}`] = i;
        const start = performance.now();
        const keys = Object.keys(obj);
        const end = performance.now();
        console.log(`[PERF] Object.keys 10000 took ${(end - start).toFixed(2)}ms`);
        expect(keys.length).toBe(10000);
    });
});
