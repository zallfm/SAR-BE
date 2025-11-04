
import type { UarDivisionBatchUpdateDTO } from "../../types/uar_division";
import { prisma } from "../../db/prisma";
async function getDbNow(): Promise<Date> {
    const rows: Array<{ now: Date }> = await prisma.$queryRaw`SELECT GETDATE() AS now`;
    return rows[0]?.now ?? new Date();
}

export const uarDivisionRepository = {

    async listUars(params: {
        page: number;
        limit: number;
        userDivisionId: number;
        period?: string;
        uarId?: string;
    }) {
        const { page, limit, userDivisionId, period, uarId } = params;

        const where: any = {
            DIVISION_ID: userDivisionId,
        };

     
        const whereUar: any = {
            DIVISION_ID: userDivisionId,
        };
        if (period) {
            whereUar.UAR_PERIOD = period;
        }
        if (uarId) {
            whereUar.UAR_ID = { contains: uarId };
        }

        const [dataRaw, totalGroups] = await Promise.all([
            prisma.tB_R_UAR_DIVISION_USER.findMany({
                where: whereUar,
                select: {
                    UAR_ID: true,
                    UAR_PERIOD: true,
                },
                distinct: ["UAR_ID", "UAR_PERIOD"],
                orderBy: { UAR_ID: "desc" }, // Or CREATED_DT if it were here
                skip: (page - 1) * limit,
                take: limit,
            }),
            // Use groupBy to get the distinct count
            prisma.tB_R_UAR_DIVISION_USER.groupBy({
                by: ["UAR_ID", "UAR_PERIOD"],
                where: whereUar,
            }),
        ]);
        // The total count is the length of the grouped results
        const totalRows = totalGroups.length;

        // Now, for each UAR_ID, get its workflow status
        const uarIds = dataRaw.map((d) => d.UAR_ID);
        if (uarIds.length === 0) {
            // No results, return empty
            return { data: [], total: 0 };
        }

        const workflowStatus = await prisma.tB_R_WORKFLOW.findMany({
            where: {
                UAR_ID: { in: uarIds },
                DIVISION_ID: userDivisionId,
            },
            // Get the latest status per UAR_ID, assuming multiple seq_no
            distinct: ["UAR_ID"],
            orderBy: {
                UAR_ID: 'desc',
                SEQ_NO: 'desc' // Or whatever logic determines the "main" workflow item
            },
            select: {
                UAR_ID: true,
                CREATED_DT: true,
                APPROVED_DT: true,
                IS_APPROVED: true,
                IS_REJECTED: true,
            },
        });

        // Combine the data
        const dataMap = new Map(workflowStatus.map((w) => [w.UAR_ID, w]));
        const combinedData = dataRaw.map((r) => {
            const wf = dataMap.get(r.UAR_ID);
            return {
                UAR_ID: r.UAR_ID,
                UAR_PERIOD: r.UAR_PERIOD,
                CREATED_DT: wf?.CREATED_DT,
                APPROVED_DT: wf?.APPROVED_DT,
                IS_APPROVED: wf?.IS_APPROVED,
                IS_REJECTED: wf?.IS_REJECTED,
            };
        });

        return { data: combinedData, total: totalRows };
    },


    async getUarDetails(uarId: string, userDivisionId: number) {
        return prisma.tB_R_UAR_DIVISION_USER.findMany({
            where: {
                UAR_ID: uarId,
                DIVISION_ID: userDivisionId,
            },
            orderBy: {
                NAME: "asc", // Order by user name
            },
        });
    },


    async batchUpdate(
        dto: UarDivisionBatchUpdateDTO,
        userNoreg: string,
        userDivisionId: number
    ) {
        const { uarId, decision, items, comments } = dto;
        const now = await getDbNow();

        const divApprovalStatus = decision === "Approve" ? "A" : "R";
        const isApproved = decision === "Approve" ? "Y" : "N";
        const isRejected = decision === "Approve" ? "N" : "Y";

        // 1. Define the update for TB_R_UAR_DIVISION_USER
        const updateDivisionUsers = prisma.tB_R_UAR_DIVISION_USER.updateMany({
            where: {
                UAR_ID: uarId,
                DIVISION_ID: userDivisionId,
                OR: items.map((item) => ({
                    USERNAME: item.username,
                    ROLE_ID: item.roleId,
                })),
            },
            data: {
                DIV_APPROVAL_STATUS: divApprovalStatus,
                REVIEWED_BY: userNoreg, // The user performing the action
                REVIEWED_DT: now,
            },
        });

        // 2. Define the update for TB_R_WORKFLOW
        const updateWorkflow = prisma.tB_R_WORKFLOW.updateMany({
            where: {
                UAR_ID: uarId,
                DIVISION_ID: userDivisionId,
                // You might want to target a specific SEQ_NO here
            },
            data: {
                IS_APPROVED: isApproved,
                IS_REJECTED: isRejected,
                APPROVED_BY: userNoreg,
                APPROVED_DT: now,
                // TODO: Add a "REMARKS" or "COMMENTS" NVarChar(500) field to your
                // TB_R_WORKFLOW table in schema.prisma to store comments.
                // REMARKS: comments,
            },
        });

        // 3. Execute both updates in a transaction
        try {
            const [userUpdateResult, workflowUpdateResult] =
                await prisma.$transaction([updateDivisionUsers, updateWorkflow]);

            return { userUpdateResult, workflowUpdateResult };
        } catch (error) {
            console.error("Batch update transaction failed:", error);
            throw new Error("Batch update failed.");
        }
    },
};