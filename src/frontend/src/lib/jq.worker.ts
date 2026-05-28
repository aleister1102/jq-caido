import * as jq from "jq-wasm";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

self.onmessage = async (e: MessageEvent) => {
  const { id, jsonBuffer, query, flags } = e.data;
  try {
    const json = decoder.decode(new Uint8Array(jsonBuffer));
    const result = await jq.raw(json, query, flags);
    const stdoutBytes = encoder.encode(result.stdout ?? "");
    const stderrBytes = encoder.encode(result.stderr ?? "");
    self.postMessage(
      { id, success: true, stdoutBuffer: stdoutBytes.buffer, stderrBuffer: stderrBytes.buffer, exitCode: result.exitCode ?? 0 },
      { transfer: [stdoutBytes.buffer, stderrBytes.buffer] },
    );
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err?.message ?? "Unknown error" });
  }
};
