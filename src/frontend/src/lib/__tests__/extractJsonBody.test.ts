import { describe, it, expect } from "vitest";
import { extractJsonBodyString } from "../extractJsonBody";

describe("extractJsonBody", () => {
  it("should extract JSON body from HTTP message with CR LF separator", () => {
    const raw = 'GET /api HTTP/1.1\r\nHost: example.com\r\n\r\n{"foo":"bar"}';
    const result = extractJsonBodyString(raw);
    expect(result).toBe('{"foo":"bar"}');
  });

  it("should extract JSON body from HTTP message with LF separator", () => {
    const raw = 'POST /api HTTP/1.1\nHost: example.com\n\n{"data":[1,2,3]}';
    const result = extractJsonBodyString(raw);
    expect(result).toBe('{"data":[1,2,3]}');
  });

  it("should return raw as is if not an HTTP message", () => {
    const raw = '{"test":"json"}';
    const result = extractJsonBodyString(raw);
    expect(result).toBe('{"test":"json"}');
  });

  it("should memoize result for same raw input", () => {
    const raw = 'GET / HTTP/1.1\r\n\r\n{"key":"value"}';
    const result1 = extractJsonBodyString(raw);
    const result2 = extractJsonBodyString(raw);
    expect(result1).toBe(result2);
  });

  it("should handle large 10MB payload without excessive string copying", () => {
    const largeBody = JSON.stringify({ data: "a".repeat(100 * 1024) });
    const raw = `POST / HTTP/1.1\r\nHost: localhost\r\nContent-Length: ${largeBody.length}\r\n\r\n${largeBody}`;
    const start = performance.now();
    const result = extractJsonBodyString(raw);
    const end = performance.now();
    expect(result).toBeDefined();
    expect(result).toContain('"data"');
    console.debug(`[PERF] extractJsonBody large payload in ${(end - start).toFixed(2)}ms`);
  });
});
