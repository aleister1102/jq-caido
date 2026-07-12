import type { Caido } from "@caido/sdk-frontend";
import type { JqBackendApi, JqBackendEvents } from "../../shared/jqContract";

export type PluginCaido = Caido<JqBackendApi, JqBackendEvents>;

let caidoInstance: PluginCaido | null = null;

export function setCaido(caido: PluginCaido) {
  caidoInstance = caido;
}

export function getCaido(): PluginCaido | null {
  return caidoInstance;
}
