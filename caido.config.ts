import { defineConfig } from "@caido-community/dev";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  id: "jq",
  name: "JQ",
  description: "JQ view mode for JSON bodies",
  version: "1.0.0",
  author: {
    name: "insomnia1102",
  },
  plugins: [
    {
      kind: "frontend",
      id: "jq-frontend",
      name: "JQ Viewer",
      root: "./src/frontend",
      vite: {
        plugins: [vue()],
        // Prevent jq-wasm from thinking it's running in Node when Caido exposes `process.versions.node`.
        // This keeps jq-wasm on the browser/XHR/fetch path instead of trying to use `fs`.
        define: {
          "process.type": "\"renderer\"",
        },
        build: {
          rollupOptions: {
            // IMPORTANT: Caido provides a shared `vue` runtime.
            // If we bundle our own Vue, reactivity won't update inside Caido (double-Vue mismatch).
            // NOTE: Vite/Rollup sometimes pass resolved IDs here (absolute paths),
            // so we match both the bare specifier and the resolved node_modules paths.
            external: (id: string) => {
              if (id === "vue") return true;
              if (id.startsWith("vue/")) return true;
              if (id.includes("/node_modules/vue/") || id.includes("\\node_modules\\vue\\")) return true;
              return false;
            },
          },
        },
      },
    },
  ],
});
