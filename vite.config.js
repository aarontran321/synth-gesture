import { cpSync, mkdirSync } from "node:fs";
import { defineConfig } from "vite";

function copyHandRuntime() {
  const target = "public/mediapipe";
  mkdirSync(target, { recursive: true });
  cpSync("node_modules/@mediapipe/tasks-vision/wasm", target, { recursive: true });
}

export default defineConfig({
  plugins: [
    {
      name: "copy-mediapipe-wasm",
      buildStart: copyHandRuntime,
      configureServer: copyHandRuntime,
    },
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
