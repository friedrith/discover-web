import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// One config, two builds:
//   vite build                                  -> dist/client (index.html, JS, CSS)
//   vite build --ssr src/entry-server.tsx ...   -> dist/server (render + RPC handler)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist/client",
  },
});
