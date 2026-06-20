import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works on any static host (GitHub Pages, itch.io, etc.)
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    host: true,
    port: 5188,
  },
});
