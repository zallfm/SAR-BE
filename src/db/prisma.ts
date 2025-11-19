import { PrismaClient as PrismaSAR } from "../generated/prisma/index.js";
import { PrismaClient as PrismaSC } from "../generated/prisma-sc/index.js";
import { PrismaClient as PrismaLdap } from "../generated/prisma-ldap/index.js";
import { PrismaClient as PrismaTmmin } from "../generated/prisma-tmmin/index.js";
import { PrismaClient as PrismaDataMaster } from "../generated/prisma-datamaster/index.js";
import { PrismaClient as PrismaHrPortal } from "../generated/prisma-hrportal/index.js";

declare global {
  var prisma: PrismaSAR | undefined;
  var prismaSC: PrismaSC | undefined;
  var prismaLdap: PrismaLdap | undefined;
  var prismaTmmin: PrismaTmmin | undefined;
  var prismaDataMaster: PrismaDataMaster | undefined;
  var prismaHrPortal: PrismaHrPortal | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaSAR({
    log:
      process.env.NODE_ENV === "development"
        ? ["error"]
        : ["error"],
  });

export const prismaSC =
  global.prismaSC ||
  new PrismaSC({
    log: ["error"],
  });

export const prismaLdap =
  global.prismaLdap ||
  new PrismaLdap({
    log: ["error"],
  });

export const prismaTmmin =
  global.prismaTmmin ||
  new PrismaTmmin({
    log: ["error"],
  });
  
export const prismaDataMaster =
  global.prismaDataMaster ||
  new PrismaDataMaster({
    log: ["error"],
  });

export const prismaHrPortal =
  global.prismaHrPortal ||
  new PrismaHrPortal({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
  global.prismaSC = prismaSC;
  global.prismaLdap = prismaLdap;
  global.prismaTmmin = prismaTmmin;
  global.prismaDataMaster = prismaDataMaster;
  global.prismaHrPortal = prismaHrPortal;
}