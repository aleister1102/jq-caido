import type { Caido } from "@caido/sdk-frontend";

let caidoInstance: Caido | null = null;

export function setCaido(caido: Caido) {
  caidoInstance = caido;
}

export function getCaido(): Caido | null {
  return caidoInstance;
}

