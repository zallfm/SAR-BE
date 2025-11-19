import fp from "fastify-plugin";
import { prisma, prismaSC, prismaLdap, prismaTmmin } from "../db/prisma";

export default fp(async (fastify) => {
  fastify.decorate("prisma", prisma);
  fastify.decorate("prismaSC", prismaSC);
  fastify.decorate("prismaLdap", prismaLdap);
  fastify.decorate("prismaTmmin", prismaTmmin);

  fastify.addHook("onClose", async (instance) => {
    await Promise.all([
      instance.prisma.$disconnect(),
      instance.prismaSC.$disconnect(),
      instance.prismaLdap.$disconnect(),
      instance.prismaTmmin.$disconnect(),
    ]);
  });
});

declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
    prismaSC: typeof prismaSC;
    prismaLdap: typeof prismaLdap;
    prismaTmmin: typeof prismaTmmin;
  }
}