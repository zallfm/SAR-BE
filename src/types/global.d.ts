import type { FastifyInstance } from "fastify";

declare global {
  // deklarasi properti global untuk app
  var app: FastifyInstance;
}

export {};
