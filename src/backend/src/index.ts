import type { DefineAPI, SDK } from "caido:plugin";
import type { NativeJqRequest } from "../../shared/jqContract";
import { cancelNativeJqTask, probeNativeJqAvailability, runNativeJqTask, type NativeTaskState } from "./nativeJq";

const activeTasks = new Map<string, NativeTaskState>();

async function nativeJqAvailability(_sdk: SDK, forceRefresh = false) {
  return probeNativeJqAvailability(forceRefresh);
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
  sdk.api.register("nativeJqAvailability", nativeJqAvailability);
  sdk.api.register("runNativeJq", runNativeJq);
  sdk.api.register("cancelNativeJq", cancelNativeJq);
}
