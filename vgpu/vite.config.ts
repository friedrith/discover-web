import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { wgslVitePlugin } from "@vgpu/wgsl/loader-vite";

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [wgslVitePlugin()],
  build: {
    rollupOptions: {
      // Vite only auto-discovers the root index.html; every other page needs
      // to be listed here so `vite build` includes it.
      input: {
        index: resolve("index.html"),
        landing: resolve("landing/index.html"),
        radianceCascades: resolve("radiance-cascades/index.html"),
        montrealSkyline: resolve("montreal-skyline/index.html"),
        desk: resolve("desk/index.html"),
        toon: resolve("toon/index.html"),
      },
    },
  },
});
