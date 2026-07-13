import type { JqFlag } from "./jqPolicy";

export type JqEnginePreference = "automatic" | "jq-wasm" | "native";
export type JqEngine = "jq-wasm" | "native";
export type JqHost = "browser" | "caido-backend-host";

export type JqExecutionSummary = {
  engine: JqEngine;
  host: JqHost;
  inputBytes: number;
  stdoutBytes: number;
  stderrBytes: number;
  durationMs: number;
  exitCode: number;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  cancelled?: boolean;
  timedOut?: boolean;
};

export type JqExecutionResult = JqExecutionSummary & {
  stdout: string;
  stderr: string;
};

export type WorkerJqRequest = {
  id: number;
  inputBuffer: ArrayBuffer;
  inputBytes: number;
  query: string;
  flags: JqFlag[];
};

export type WorkerJqSuccess = {
  id: number;
  success: true;
  result: JqExecutionSummary;
  stdoutBuffer: ArrayBuffer;
  stderrBuffer: ArrayBuffer;
};

export type WorkerJqFailure = {
  id: number;
  success: false;
  error: string;
};

export type WorkerJqResponse = WorkerJqSuccess | WorkerJqFailure;

export type NativeJqAvailability = {
  available: boolean;
  version: string | null;
  reason: string | null;
};

export type NativeJqRequest = {
  taskId: string;
  input: string;
  inputBytes: number;
  query: string;
  flags: JqFlag[];
  timeoutMs: number;
};

export type JqBackendApi = {
  nativeJqAvailability: (forceRefresh?: boolean) => Promise<NativeJqAvailability>;
  runNativeJq: (request: NativeJqRequest) => Promise<JqExecutionResult>;
  cancelNativeJq: (taskId: string) => Promise<boolean>;
};

export type JqBackendEvents = Record<string, never>;
