import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  bundle: true, // Bundle all code
  splitting: false, // Single output file
  dts: false,
  minify: false, // Keep readable for debugging
  // Keep all node_modules external (they'll be resolved at runtime)
  noExternal: [],
  external: [
    // Prisma clients must be external (runtime dependencies)
    /^@prisma\/client/,
    /\.prisma\/client/,
    /generated\/prisma/,
    /generated\/prisma-sc/,
  ],
  esbuildOptions(options) {
    options.platform = "node";
    options.format = "esm";
    options.packages = "external"; // Keep all packages external
  },
});