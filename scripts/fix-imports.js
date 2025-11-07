#!/usr/bin/env node
/**
 * Post-build script to add .js extensions to relative imports in compiled JavaScript files.
 * This is necessary for ES modules in Node.js, which require explicit file extensions.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, "..", "dist");

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let originalContent = content;

  // Fix Prisma imports: change any ../generated/ or ../../../generated/ to ./generated/ for bundled files
  // This is needed because dist/server.js imports from ../generated/ but generated/ is in dist/
  content = content.replace(
    /(from|import\s*\(|import\s+)\s*['"](\.\.\/)+generated\/(prisma[^'"]*?)['"]/g,
    (match, keyword, dots, rest) => {
      return `${keyword} "./generated/${rest}"`;
    }
  );

  // More aggressive pattern: match any relative import that doesn't end with an extension
  // This handles: from "./path", import("./path"), import "./path", require("./path")
  const importPattern =
    /(from|import\s*\(|import\s+)\s*['"](\.\.?\/[^'"]+?)['"]/g;

  content = content.replace(importPattern, (match, keyword, importPath) => {
    // Skip if already has extension
    if (/\.(js|mjs|json|ts|tsx|jsx)$/i.test(importPath)) {
      return match;
    }

    // Skip if it's a directory import (we'll handle that separately)
    const dirPath = path.join(path.dirname(filePath), importPath);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const indexPath = path.join(dirPath, "index.js");
      if (fs.existsSync(indexPath)) {
        return match.replace(importPath, importPath + "/index.js");
      }
      // If directory exists but no index.js, add .js anyway (might be a package)
      return match.replace(importPath, importPath + ".js");
    }

    // Check if file exists with .js extension
    const fullPath = path.join(path.dirname(filePath), importPath + ".js");
    if (fs.existsSync(fullPath)) {
      return match.replace(importPath, importPath + ".js");
    }

    // For relative imports, always add .js (Node.js ES modules requirement)
    // This is safe because TypeScript doesn't output relative imports without extensions
    // unless they're meant to be resolved at runtime
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
      return match.replace(importPath, importPath + ".js");
    }

    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Fixed imports in: ${path.relative(distDir, filePath)}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  let fixedCount = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixedCount += walkDir(filePath);
    } else if (file.endsWith(".js")) {
      if (fixImportsInFile(filePath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

if (!fs.existsSync(distDir)) {
  console.error(`Dist directory not found: ${distDir}`);
  process.exit(1);
}

console.log("Fixing imports in compiled files...");
const fixedCount = walkDir(distDir);
console.log(`Done! Fixed imports in ${fixedCount} file(s).`);
