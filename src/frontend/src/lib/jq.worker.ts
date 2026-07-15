import "./jq.worker.base64";
import { loadJq, type Jq } from "jq-wasm/inline";
import type { WorkerJqRequest, WorkerJqSuccess } from "../../../shared/jqContract";
import { JQ_BROWSER_HOST, JQ_STDERR_MAX_BYTES, JQ_STDOUT_MAX_BYTES } from "../../../shared/jqPolicy";
import { encodeTextForTransfer } from "../../../shared/jqTransfer";

const decoder = new TextDecoder();

let jqHandlePromise: Promise<Jq> | null = null;

async function ensureJqHandle(): Promise<Jq> {
  if (jqHandlePromise === null) {
    jqHandlePromise = loadJq();
  }
  return jqHandlePromise;
}

self.onmessage = async (event: MessageEvent<WorkerJqRequest>) => {
  const { id, inputBuffer, inputBytes, query, flags } = event.data;
  try {
    const start = performance.now();
    const jq = await ensureJqHandle();
    const input = decoder.decode(new Uint8Array(inputBuffer));
    const rawResult = jq.raw(input, query, flags);
    const stdout = encodeTextForTransfer(rawResult.stdout ?? "", JQ_STDOUT_MAX_BYTES);
    const stderr = encodeTextForTransfer(rawResult.stderr ?? "", JQ_STDERR_MAX_BYTES);

    const response: WorkerJqSuccess = {
      id,
      success: true,
      result: {
        engine: "jq-wasm",
        host: JQ_BROWSER_HOST,
        inputBytes,
        stdoutBytes: stdout.bytes,
        stderrBytes: stderr.bytes,
        durationMs: performance.now() - start,
        exitCode: rawResult.exitCode ?? 0,
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated,
      },
      stdoutBuffer: stdout.buffer,
      stderrBuffer: stderr.buffer,
    };

    self.postMessage(response, [stdout.buffer, stderr.buffer]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    self.postMessage({ id, success: false, error: message });
  }
};
