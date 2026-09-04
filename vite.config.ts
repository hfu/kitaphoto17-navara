import { defineConfig } from "vite";

// GitHub Pages serves this repo from the `docs/` folder on `main`, at
// https://hfu.github.io/kitaphoto17-navara/ — so both the base path and the
// build output directory are pinned to match that.
export default defineConfig({
  base: "/kitaphoto17-navara/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // No content hashes: GitHub Pages has no build step to rewrite
        // references, so a stable filename keeps every reference in
        // index.html valid across rebuilds.
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
