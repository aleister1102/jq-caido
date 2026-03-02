import { describe, it, expect } from "vitest";
import { getSuggestions, parseJqPath, resolvePath, type Suggestion } from "../jq-suggestion";

describe("jq-suggestion", () => {
  describe("parseJqPath", () => {
    it("should parse simple dot notation", () => {
      expect(parseJqPath(".foo.bar")).toEqual(["foo", "bar"]);
    });

    it("should parse array indices", () => {
      expect(parseJqPath(".foo[0].bar")).toEqual(["foo", "0", "bar"]);
    });

    it("should handle quoted keys in brackets", () => {
      expect(parseJqPath('.foo["bar"]')).toEqual(["foo", "bar"]);
    });

    it("should return empty array for root query", () => {
      expect(parseJqPath(".")).toEqual([]);
    });
  });

  describe("resolvePath", () => {
    it("should resolve object properties", () => {
      const json = { foo: { bar: "baz" } };
      expect(resolvePath(json, ["foo", "bar"])).toBe("baz");
    });

    it("should resolve array indices", () => {
      const json = { items: [{ id: 1 }, { id: 2 }] };
      expect(resolvePath(json, ["items", "0"])).toEqual({ id: 1 });
    });

    it("should return null for invalid path", () => {
      const json = { foo: "bar" };
      expect(resolvePath(json, ["foo", "baz"])).toBeNull();
    });
  });

  describe("getSuggestions - array iterator normalization", () => {
    it("should normalize [] to [0] and resolve array element properties", () => {
      const json = {
        data: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
      };
      // When query ends with [], we need to add . to get property suggestions
      const suggestions = getSuggestions(json, ".data[].");
      // Should suggest properties from the first array element
      expect(suggestions.some((s) => s.text === "id")).toBe(true);
      expect(suggestions.some((s) => s.text === "name")).toBe(true);
    });

    it("should suggest properties after [] iterator", () => {
      const json = {
        items: [{ title: "Item 1", count: 5 }],
      };
      const suggestions = getSuggestions(json, ".items[].");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.text === "title")).toBe(true);
      expect(suggestions.some((s) => s.text === "count")).toBe(true);
    });

    it("should filter suggestions by prefix after []", () => {
      const json = {
        data: [{ name: "Alice", age: 30 }],
      };
      const suggestions = getSuggestions(json, ".data[].na");
      expect(suggestions).toEqual([{ text: "name", type: "property", dataType: "string" }]);
    });
  });

  describe("getSuggestions - nested objects", () => {
    it("should suggest nested object properties", () => {
      const json = {
        user: {
          profile: {
            firstName: "John",
            lastName: "Doe",
          },
        },
      };
      const suggestions = getSuggestions(json, ".user.profile.");
      expect(suggestions.some((s) => s.text === "firstName")).toBe(true);
      expect(suggestions.some((s) => s.text === "lastName")).toBe(true);
    });

    it("should filter suggestions by prefix", () => {
      const json = {
        data: {
          firstName: "John",
          lastName: "Doe",
          age: 30,
        },
      };
      const suggestions = getSuggestions(json, ".data.fir");
      expect(suggestions).toEqual([{ text: "firstName", type: "property", dataType: "string" }]);
    });
  });

  describe("getSuggestions - edge cases", () => {
    it("should return empty array for null JSON", () => {
      expect(getSuggestions(null, ".")).toEqual([]);
    });

    it("should return empty array for undefined JSON", () => {
      expect(getSuggestions(undefined, ".")).toEqual([]);
    });

    it("should return empty array for empty array", () => {
      expect(getSuggestions([], ".[]")).toEqual([]);
    });

    it("should return empty array when path resolves to non-object", () => {
      const json = { value: "string" };
      expect(getSuggestions(json, ".value.")).toEqual([]);
    });

    it("should suggest root-level properties", () => {
      const json = { foo: "bar", baz: "qux" };
      const suggestions = getSuggestions(json, ".");
      expect(suggestions.length).toBe(2);
      expect(suggestions.some((s) => s.text === "foo")).toBe(true);
      expect(suggestions.some((s) => s.text === "baz")).toBe(true);
    });

    it("should suggest array indices for arrays", () => {
      const json = { items: ["a", "b", "c"] };
      const suggestions = getSuggestions(json, ".items[");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.text === "[0]" && s.type === "index")).toBe(true);
    });
  });
});
