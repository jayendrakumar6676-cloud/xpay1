import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// In the Emergent preview env, supervisor runs:
//   - frontend (vite) on :3000 (this config)
//   - backend  (FastAPI) on :8001
// Ingress automatically routes `/api/*` requests to the backend, so the
// dev-time proxy is only needed for local development on a laptop.
const useLocalProxy = process.env.LOCAL_API_PROXY === "1";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
    ...(useLocalProxy
      ? {
          proxy: {
            "/api": {
              target: "http://localhost:8787",
              changeOrigin: true,
            },
          },
        }
      : {}),
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
