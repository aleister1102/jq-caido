import type { DefineAPI, SDK } from "caido:plugin";
import type { NativeJqRequest } from "../../shared/jqContract";
import { cancelNativeJqTask, probeNativeJqAvailability, runNativeJqTask, type NativeTaskState } from "./nativeJq";

const activeTasks = new Map<string, NativeTaskState>();

async function nativeJqAvailability(_sdk: SDK, forceRefresh = false) {
  try {
    return await probeNativeJqAvailability(forceRefresh);
  } catch (err) {
    return {
      available: false,
      version: null,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runNativeJq(_sdk: SDK, request: NativeJqRequest) {
  return runNativeJqTask(request, activeTasks);
}

function cancelNativeJq(_sdk: SDK, taskId: string) {
  return cancelNativeJqTask(taskId, activeTasks);
}

export type API = DefineAPI<{
  nativeJqAvailability: typeof nativeJqAvailability;
  runNativeJq: typeof runNativeJq;
  cancelNativeJq: typeof cancelNativeJq;
}>;

export function init(sdk: SDK<API>) {
  try {
    sdk.api.register("nativeJqAvailability", nativeJqAvailability);
    sdk.api.register("runNativeJq", runNativeJq);
    sdk.api.register("cancelNativeJq", cancelNativeJq);
  } catch (err) {
    console.error("JQ backend init failed:", err);
  }
}
