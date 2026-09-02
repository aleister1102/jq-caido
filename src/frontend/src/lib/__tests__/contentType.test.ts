import { describe, expect, it } from "vitest";
import { extractContentType, isJsonContentType } from "../contentType";

describe("contentType", () => {
  describe("extractContentType", () => {
    it("extracts text/json MIME type", () => {
      const raw = "HTTP/1.1 200 OK\r\nContent-Type: text/json\r\n\r\n{}";
      expect(extractContentType(raw)).toBe("text/json");
    });

    it("extracts text/json with charset and parameters", () => {
      const raw = "HTTP/1.1 200 OK\r\nContent-Type: text/json; charset=utf-8\r\n\r\n{}";
      expect(extractContentType(raw)).toBe("text/json");
    });

    it("handles case-insensitive Content-Type header with LF only", () => {
      const raw = "HTTP/1.1 200 OK\ncontent-type: TEXT/JSON; charset=UTF-8\n\n{}";
      expect(extractContentType(raw)).toBe("text/json");
    });

    it("extracts quoted MIME types", () => {
      const raw = "HTTP/1.1 200 OK\r\nContent-Type: \"text/json\"\r\n\r\n{}";
      expect(extractContentType(raw)).toBe("text/json");
    });

    it("extracts application/json from request messages", () => {
      const raw = "POST /api HTTP/1.1\r\nHost: example.com\r\nContent-Type: application/json\r\n\r\n{}";
      expect(extractContentType(raw)).toBe("application/json");
    });

    it("returns null for messages without headers", () => {
      expect(extractContentType('{"body":"only"}')).toBeNull();
      expect(extractContentType("")).toBeNull();
    });

    it("ignores fake headers inside the body", () => {
      const raw = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nContent-Type: text/json\r\n{}";
      expect(extractContentType(raw)).toBe("text/plain");
    });
  });

  describe("isJsonContentType", () => {
    it("recognizes text/json as JSON", () => {
      expect(isJsonContentType("text/json")).toBe(true);
    });

    it("recognizes text/x-json as JSON", () => {
      expect(isJsonContentType("text/x-json")).toBe(true);
    });

    it("recognizes standard application/json", () => {
      expect(isJsonContentType("application/json")).toBe(true);
    });

    it("recognizes structured JSON types with +json suffix", () => {
      expect(isJsonContentType("application/problem+json")).toBe(true);
      expect(isJsonContentType("application/vnd.api+json")).toBe(true);
      expect(isJsonContentType("application/ld+json")).toBe(true);
    });

    it("recognizes ndjson and jsonlines types", () => {
      expect(isJsonContentType("application/x-ndjson")).toBe(true);
      expect(isJsonContentType("application/ndjson")).toBe(true);
      expect(isJsonContentType("application/jsonlines")).toBe(true);
    });

    it("rejects non-JSON MIME types", () => {
      expect(isJsonContentType("text/html")).toBe(false);
      expect(isJsonContentType("text/plain")).toBe(false);
      expect(isJsonContentType("application/xml")).toBe(false);
      expect(isJsonContentType("application/x-www-form-urlencoded")).toBe(false);
      expect(isJsonContentType("application/octet-stream")).toBe(false);
    });
  });
});
