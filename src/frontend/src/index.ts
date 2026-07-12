import JqViewMode from "./views/JqViewMode.vue";
import { setCaido, type PluginCaido } from "./caido";
import { warmupJqWorker } from "./lib/runJq";

export const init = (caido: PluginCaido) => {
  setCaido(caido);
  warmupJqWorker();

  const when = (data: unknown): boolean =>
    typeof data === "object" && data !== null && "raw" in data && !!(data as { raw: unknown }).raw;

  const viewMode = { label: "JQ", view: { component: JqViewMode }, when };

  for (const surface of [caido.httpHistory, caido.replay, caido.search, caido.sitemap]) {
    if (surface) {
      surface.addRequestViewMode(viewMode);
      surface.addResponseViewMode(viewMode);
    }
  }
};
