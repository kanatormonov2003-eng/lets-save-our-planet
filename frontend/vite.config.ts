import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    open: false,
  },
  preview: { port: 4173 },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
    cssTarget: "chrome100",
    chunkSizeWarningLimit: 900,
  },
});
