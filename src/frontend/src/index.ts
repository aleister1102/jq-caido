import type { Caido } from "@caido/sdk-frontend";
import JqViewMode from "./views/JqViewMode.vue";
import { setCaido } from "./caido";

export const init = (caido: Caido) => {
  setCaido(caido);

  const condition = (data: any): boolean => {
    // Show JQ view mode if there is raw data.
    return !!data?.raw;
  };

  const viewMode = {
    label: "JQ",
    view: {
      component: JqViewMode,
    },
    condition,
  };

  // Register for both requests and responses across all major surfaces
  if (caido.httpHistory) {
    caido.httpHistory.addRequestViewMode(viewMode);
    // @ts-ignore
    if (caido.httpHistory.addResponseViewMode) {
      // @ts-ignore
      caido.httpHistory.addResponseViewMode(viewMode);
    }
  }

  if (caido.replay) {
    caido.replay.addRequestViewMode(viewMode);
    // @ts-ignore
    if (caido.replay.addResponseViewMode) {
      // @ts-ignore
      caido.replay.addResponseViewMode(viewMode);
    }
  }

  if (caido.search) {
    caido.search.addRequestViewMode(viewMode);
    // @ts-ignore
    if (caido.search.addResponseViewMode) {
      // @ts-ignore
      caido.search.addResponseViewMode(viewMode);
    }
  }

  if (caido.sitemap) {
    caido.sitemap.addRequestViewMode(viewMode);
    // @ts-ignore
    if (caido.sitemap.addResponseViewMode) {
      // @ts-ignore
      caido.sitemap.addResponseViewMode(viewMode);
    }
  }
};
