import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A static site: mvp.json is imported, not fetched. The 840 lines this file
// used to carry were all dev-server middleware (/api/mvp.json, parity, connector
// discovery) that cannot exist in a static build.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false },
});
