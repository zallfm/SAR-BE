
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
                // MODIFIED: Select UAR_ID, UAR_PERIOD, and the related Division Name
                select: {
                    UAR_ID: true,
                    UAR_PERIOD: true,
                    TB_M_DIVISION: {
                        select: {
                            DIVISION_NAME: true,
                        },
                    },
                },
                distinct: ["UAR_ID", "UAR_PERIOD"],
                orderBy: { UAR_ID: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.tB_R_UAR_DIVISION_USER.groupBy({
                by: ["UAR_ID", "UAR_PERIOD"],
                where: whereUar,
            }),
        ]);
        const totalRows = totalGroups.length;

        const uarIds = dataRaw.map((d) => d.UAR_ID);
        if (uarIds.length === 0) {
            return { data: [], total: 0, workflowStatus: [], completionStats: [] };
        }

        const [workflowStatus, completionStats] = await Promise.all([
            prisma.tB_R_WORKFLOW.findMany({
                where: {
                    UAR_ID: { in: uarIds },
                    DIVISION_ID: userDivisionId,
                },
                distinct: ["UAR_ID"],
                orderBy: [
                    { UAR_ID: 'desc', },
                    { SEQ_NO: 'desc' }
                ],
                select: {
                    UAR_ID: true,
                    CREATED_DT: true,
                    APPROVED_DT: true,
                    IS_APPROVED: true,
                    IS_REJECTED: true,
                },
            }),
            prisma.tB_R_UAR_DIVISION_USER.groupBy({
                by: ['UAR_ID', 'DIV_APPROVAL_STATUS'],
                where: {
                    UAR_ID: { in: uarIds },
                    DIVISION_ID: userDivisionId
                },
                _count: {
                    _all: true
                }
            })
        ]);

        return { data: dataRaw, total: totalRows, workflowStatus, completionStats };
    },

    async getUarDetails(uarId: string, userDivisionId: number) {
        return prisma.tB_R_UAR_DIVISION_USER.findMany({
            where: {
                UAR_ID: uarId,
                DIVISION_ID: userDivisionId,
            },
            orderBy: {
                NAME: "asc",
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
        const divApprovalStatus = decision === "Approve" ? "1" : "0";

        try {
            return await prisma.$transaction(async (tx) => {
                const userUpdateResult = await tx.tB_R_UAR_DIVISION_USER.updateMany({
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
                        REVIEWED_BY: userNoreg,
                        REVIEWED_DT: now,
                    },
                });

                const allItemsInUar = await tx.tB_R_UAR_DIVISION_USER.findMany({
                    where: {
                        UAR_ID: uarId,
                        DIVISION_ID: userDivisionId,
                    },
                    select: {
                        DIV_APPROVAL_STATUS: true,
                    },
                });

                const totalItems = allItemsInUar.length;
                let rejectedCount = 0;
                let pendingCount = 0;

                for (const item of allItemsInUar) {
                    if (item.DIV_APPROVAL_STATUS === '0') {
                        rejectedCount++;
                    } else if (item.DIV_APPROVAL_STATUS === null) {
                        pendingCount++;
                    }
                }

                let isApproved: 'Y' | 'N' = 'N';
                let isRejected: 'Y' | 'N' = 'N';
                let approvedDt: Date | null = null;

                if (rejectedCount > 0) {
                    isRejected = 'Y';
                    approvedDt = now;
                } else if (pendingCount > 0) {
                } else {
                    isApproved = 'Y';
                    approvedDt = now;
                }

                const workflowUpdateResult = await tx.tB_R_WORKFLOW.updateMany({
                    where: {
                        UAR_ID: uarId,
                        DIVISION_ID: userDivisionId,
                    },
                    data: {
                        IS_APPROVED: isApproved,
                        IS_REJECTED: isRejected,
                        APPROVED_BY: userNoreg,
                        APPROVED_DT: approvedDt,
                    },
                });

                return { userUpdateResult, workflowUpdateResult };
            });
        } catch (error) {
            console.error("Batch update transaction failed:", error);
            throw new Error("Batch update failed.");
        }
    },
};