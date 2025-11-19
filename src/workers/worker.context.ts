import { FastifyInstance } from 'fastify';
import { PrismaClient } from '../generated/prisma';

export type WorkerContext = {
    prisma: PrismaClient;
    log: FastifyInstance['log'];
};