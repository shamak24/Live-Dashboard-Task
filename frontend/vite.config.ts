import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const API_TARGET = "http://localhost:3001";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: API_TARGET,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
});
