

/**
 * Copy Prisma generated clients to dist folder so they're available at runtime
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcGenerated = path.join(__dirname, "..", "src", "generated");
// Copy to dist/generated/ folder so imports from dist/server.js can use ./generated/prisma
const distGenerated = path.join(__dirname, "..", "dist", "generated");

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(srcGenerated)) {
  console.warn(`⚠️  Generated Prisma folder not found at: ${srcGenerated}`);
  console.warn("   Run: npm run prisma:gen:all");
  process.exit(0);
}

console.log("Copying Prisma generated clients to dist/generated/ folder...");
copyRecursive(srcGenerated, distGenerated);
console.log("✅ Prisma generated clients copied successfully!");
