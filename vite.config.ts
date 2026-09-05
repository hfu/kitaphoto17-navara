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
        // No content hashes for our own entry/chunk JS: GitHub Pages has no
        // build step to rewrite references, so a stable filename keeps
        // every reference in index.html valid across rebuilds.
        //
        // assetFileNames is intentionally left at Vite's default (hashed).
        // @navaramap/three's worker code resolves its own wasm files by a
        // literal, hardcoded filename via `self.location.href` — not
        // through Vite's `import.meta.url` asset tracking — so stripping
        // that name's hash-like suffix here breaks the lookup and the
        // whole wasm worker pool silently fails to start (see DECISIONS.md
        // D11).
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
      },
    },
  },
});
