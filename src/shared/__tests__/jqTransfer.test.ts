import { describe, expect, it } from "vitest";
import { JQ_STDOUT_MAX_BYTES } from "../jqPolicy";
import { encodeTextForTransfer } from "../jqTransfer";

describe("encodeTextForTransfer", () => {
  it("caps wasm transfer payloads at the configured byte limit", () => {
    const result = encodeTextForTransfer("a".repeat(JQ_STDOUT_MAX_BYTES + 32), JQ_STDOUT_MAX_BYTES);

    expect(result.bytes).toBe(JQ_STDOUT_MAX_BYTES);
    expect(result.truncated).toBe(true);
  });
});
