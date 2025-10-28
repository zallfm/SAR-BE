import { PrismaClient as PrismaSAR } from "../generated/prisma";
import { PrismaClient as PrismaSC } from "../generated/prisma-sc";

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
        ? ["query", "error", "warn"]
        : ["error"],
  });

// koneksi ke GLOBAL_SC_DB_DEV
export const prismaSC =
  global.prismaSC ||
  new PrismaSC({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
  global.prismaSC = prismaSC;
}
