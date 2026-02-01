import type { Caido } from "@caido/sdk-frontend";
import JqViewMode from "./views/JqViewMode.vue";
import { setCaido } from "./caido";

export const init = (caido: Caido) => {
  setCaido(caido);

  const when = (data: unknown): boolean => {
    if (typeof data === "object" && data !== null && "raw" in data) {
      return !!(data as { raw: unknown }).raw;
    }
    return false;
  };

  const viewMode = {
    label: "JQ",
    view: {
      component: JqViewMode,
    },
    when,
  };

  // Register for both requests and responses across all major surfaces
  if (caido.httpHistory) {
    caido.httpHistory.addRequestViewMode(viewMode);
    caido.httpHistory.addResponseViewMode(viewMode);
  }

  if (caido.replay) {
    caido.replay.addRequestViewMode(viewMode);
    caido.replay.addResponseViewMode(viewMode);
  }

  if (caido.search) {
    caido.search.addRequestViewMode(viewMode);
    caido.search.addResponseViewMode(viewMode);
  }

  if (caido.sitemap) {
    caido.sitemap.addRequestViewMode(viewMode);
    caido.sitemap.addResponseViewMode(viewMode);
  }
};
