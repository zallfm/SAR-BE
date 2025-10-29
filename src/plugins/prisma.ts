import fp from "fastify-plugin";
import { prisma, prismaSC } from "../db/prisma";

export default fp(async (fastify) => {
  fastify.decorate("prisma", prisma);
  fastify.decorate("prismaSC", prismaSC);

  fastify.addHook("onClose", async (instance) => {
    await Promise.all([
      instance.prisma.$disconnect(),
      instance.prismaSC.$disconnect(),
    ]);
  });
});

declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
    prismaSC: typeof prismaSC;
  }
}
