import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts"],
  format: ["esm"],
  platform: "node",
  dts: true,
  clean: true,
  esbuildOptions(options) {
    options.supported = { ...options.supported, "node-colon-prefix-import": true };
  },
});
