import { PrismaClient as PrismaSAR } from "../generated/prisma/index.js";
import { PrismaClient as PrismaSC } from "../generated/prisma-sc/index.js";

declare global {
  var prisma: PrismaSAR | undefined;
  var prismaSC: PrismaSC | undefined;
}

// koneksi ke SAR db
export const prisma =
  global.prisma ||
  new PrismaSAR({
    log:
      process.env.NODE_ENV === "development"
        ? ["error"]
        : ["error"],
  });

// koneksi ke GLOBAL_SC_DB_DEV
export const prismaSC =
  global.prismaSC ||
  new PrismaSC({
    log: ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
  global.prismaSC = prismaSC;
}
