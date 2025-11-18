import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { uarLatestRoleService } from "./uar_latest_role.service";
import { buildUarLatestRoleExcel } from "./uar_latest_role.excel";

export const uarLatestRoleController = {
  list: (_app: FastifyInstance) =>
    async (
      req: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
          applicationId?: string;
          username?: string;
          noreg?: string;
          roleId?: string;
          divisionId?: number;
          departmentId?: number;
          search?: string;
          sortBy?: string;
          order?: "asc" | "desc";
        };
      }>,
      reply: FastifyReply
    ) => {
      // Validate and normalize inputs
      const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
      const limit = Math.min(Math.max(1, Math.floor(Number(req.query.limit) || 10)), 1000);
      
      // Trim string inputs to prevent issues
      const filters = {
        applicationId: req.query.applicationId?.trim(),
        username: req.query.username?.trim(),
        noreg: req.query.noreg?.trim(),
        roleId: req.query.roleId?.trim(),
        divisionId: req.query.divisionId ? Number(req.query.divisionId) : undefined,
        departmentId: req.query.departmentId ? Number(req.query.departmentId) : undefined,
        search: req.query.search?.trim(),
        sortBy: req.query.sortBy,
        order: req.query.order,
      };

      const result = await uarLatestRoleService.list({
        page,
        limit,
        ...filters,
      });

      return reply.send({
        data: result.data,
        meta: {
          page,
          limit,
          total: result.total,
        },
      });
    },

  getDetail: (_app: FastifyInstance) =>
    async (
      req: FastifyRequest<{
        Params: {
          applicationId: string;
          username: string;
          roleId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      // Validate and trim inputs
      const applicationId = req.params.applicationId?.trim();
      const username = req.params.username?.trim();
      const roleId = req.params.roleId?.trim();

      if (!applicationId || !username || !roleId) {
        return reply.status(400).send({
          message: "Invalid parameters: applicationId, username, and roleId are required",
        });
      }

      const data = await uarLatestRoleService.getById(
        applicationId,
        username,
        roleId
      );

      if (!data) {
        return reply.status(404).send({
          message: "UAR Latest Role not found",
        });
      }

      return reply.send({ data });
    },

  exportExcel: (_app: FastifyInstance) =>
    async (
      req: FastifyRequest<{
        Querystring: {
          applicationId?: string;
          username?: string;
          noreg?: string;
          roleId?: string;
          divisionId?: number;
          departmentId?: number;
          search?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      // Validate and normalize filters
      const filters = {
        applicationId: req.query.applicationId?.trim(),
        username: req.query.username?.trim(),
        noreg: req.query.noreg?.trim(),
        roleId: req.query.roleId?.trim(),
        divisionId: req.query.divisionId ? Number(req.query.divisionId) : undefined,
        departmentId: req.query.departmentId ? Number(req.query.departmentId) : undefined,
        search: req.query.search?.trim(),
      };

      const { buffer, filename } = await buildUarLatestRoleExcel(filters);

      reply
        .header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(Buffer.from(buffer as any));
    },
};

