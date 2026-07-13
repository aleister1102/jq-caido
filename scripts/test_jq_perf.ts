import { spawnSync } from "node:child_process";
import os from "node:os";
import { loadJq } from "jq-wasm";

type Scenario = {
  name: string;
  query: string;
  flags: string[];
};

type BenchmarkRow = {
  engine: string;
  scenario: string;
  inputBytes: number;
  stdoutBytes: number;
  stderrBytes: number;
  durationMs: number;
  exitCode: number;
};

const SIZE_TARGETS = [
  { name: "1 MB", bytes: 1_000_000 },
  { name: "6 MB", bytes: 6_000_000 },
  { name: "20 MB", bytes: 20_000_000 },
];

const SCENARIOS: Scenario[] = [
  { name: "small-result", query: ".items[0:10]", flags: [] },
  { name: "identity", query: ".", flags: [] },
];

function bytes(text: string): number {
  return Buffer.byteLength(text);
}

function generatePayload(targetBytes: number): string {
  const parts = ['{"items":['];
  let totalBytes = bytes(parts[0]) + bytes("]}");
  let index = 0;

  while (totalBytes < targetBytes) {
    const item = JSON.stringify({
      id: index,
      name: `item-${index.toString().padStart(7, "0")}`,
      active: index % 2 === 0,
      tags: ["alpha", "beta", "gamma", "delta"],
      meta: {
        group: `group-${index % 5}`,
        score: index % 97,
        notes: "0123456789".repeat(12),
      },
    });
    const prefix = index === 0 ? "" : ",";
    parts.push(prefix, item);
    totalBytes += bytes(prefix) + bytes(item);
    index += 1;
  }

  parts.push("]}");
  return parts.join("");
}

function printEnvironment(jqWasmVersion: string, nativeVersion: string | null): void {
  const cpu = os.cpus()[0]?.model ?? "unknown";
  const caidoVersion = process.env.CAIDO_VERSION ?? "n/a (benchmark runs outside Caido)";

  console.log("Environment");
  console.log(`  machine: ${os.platform()} ${os.release()} ${os.arch()} - ${cpu}`);
  console.log(`  bun: ${process.versions.bun ?? "unknown"}`);
  console.log(`  node: ${process.versions.node}`);
  console.log(`  caido: ${caidoVersion}`);
  console.log(`  jq-wasm: ${jqWasmVersion}`);
  console.log(`  jq: ${nativeVersion ?? "not available on PATH"}`);
  console.log("");
}

function runNative(input: string, scenario: Scenario): BenchmarkRow | null {
  const start = performance.now();
  const result = spawnSync("jq", [...scenario.flags, scenario.query], {
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const durationMs = performance.now() - start;

  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw result.error;
  }

  return {
    engine: "native jq",
    scenario: scenario.name,
    inputBytes: bytes(input),
    stdoutBytes: bytes(result.stdout ?? ""),
    stderrBytes: bytes(result.stderr ?? ""),
    durationMs,
    exitCode: result.status ?? 1,
  };
}

async function main() {
  const jq = await loadJq();
  const nativeVersionResult = spawnSync("jq", ["--version"], { encoding: "utf8" });
  const nativeVersion =
    nativeVersionResult.status === 0
      ? nativeVersionResult.stdout.trim()
      : null;

  printEnvironment(jq.version, nativeVersion);

  const rows: BenchmarkRow[] = [];

  for (const sizeTarget of SIZE_TARGETS) {
    const payload = generatePayload(sizeTarget.bytes);
    const payloadBytes = bytes(payload);
    console.log(`Payload ${sizeTarget.name}: ${payloadBytes.toLocaleString()} bytes`);

    for (const scenario of SCENARIOS) {
      const wasmStart = performance.now();
      const wasmResult = jq.raw(payload, scenario.query, scenario.flags);
      rows.push({
        engine: "jq-wasm",
        scenario: `${sizeTarget.name} ${scenario.name}`,
        inputBytes: payloadBytes,
        stdoutBytes: bytes(wasmResult.stdout ?? ""),
        stderrBytes: bytes(wasmResult.stderr ?? ""),
        durationMs: performance.now() - wasmStart,
        exitCode: wasmResult.exitCode ?? 0,
      });

      const nativeRow = runNative(payload, scenario);
      if (nativeRow) {
        rows.push({
          ...nativeRow,
          scenario: `${sizeTarget.name} ${scenario.name}`,
        });
      }
    }
  }

  console.log("Results");
  for (const row of rows) {
    console.log(
      `${row.engine.padEnd(10)} ${row.scenario.padEnd(20)} input=${row.inputBytes.toLocaleString()}B stdout=${row.stdoutBytes.toLocaleString()}B stderr=${row.stderrBytes.toLocaleString()}B time=${row.durationMs.toFixed(1)}ms exit=${row.exitCode}`,
    );
  }
}

void main().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exitCode = 1;
});
