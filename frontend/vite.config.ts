import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const API_TARGET = "http://localhost:3001";

function ignoreProxySocketNoise(proxy: import("http-proxy").ProxyServer) {
  proxy.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "ECONNABORTED" || err.code === "ECONNRESET") return;
    console.error("[vite proxy]", err);
  });
  proxy.on("proxyReqWs", (_proxyReq, _req, socket) => {
    socket.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ECONNABORTED" || err.code === "ECONNRESET") return;
      console.error("[vite proxy ws]", err);
    });
  });
}

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
        configure: ignoreProxySocketNoise,
      },
      "/health": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        configure: ignoreProxySocketNoise,
      },
      "/socket.io": {
        target: API_TARGET,
        changeOrigin: true,
        ws: true,
        secure: false,
        configure: ignoreProxySocketNoise,
      },
    },
  },
});
