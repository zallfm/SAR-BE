import type { UarSystemOwnerBatchUpdateDTO } from "../../types/uar_system_owner";
import { prisma } from "../../db/prisma";

async function getDbNow(): Promise<Date> {
    const rows: Array<{ now: Date }> = await prisma.$queryRaw`SELECT GETDATE() AS now`;
    return rows[0]?.now ?? new Date();
}

export const uarSystemOwnerRepository = {

    /**
     * Finds applications owned by a specific user NOREG.
     */
    async findAppsByOwner(noreg: string) {
        return prisma.tB_M_APPLICATION.findMany({
            where: {
                NOREG_SYSTEM_OWNER: noreg,
                APPLICATION_STATUS: '1' // Assuming '1' is active
            },
            select: {
                APPLICATION_ID: true,
                APPLICATION_NAME: true,
            }
        });
    },

    /**
     * Lists UARs grouped by UAR_ID, Period, and Application.
     */
    async listUars(params: {
        page: number;
        limit: number;
        ownedApplicationIds: string[];
        period?: string;
        uarId?: string;
        applicationId?: string;
    }) {
        const { page, limit, ownedApplicationIds, period, uarId, applicationId } = params;

        const whereUar: any = {
            APPLICATION_ID: { in: ownedApplicationIds },
        };
        if (period) {
            whereUar.UAR_PERIOD = period;
        }
        if (uarId) {
            whereUar.UAR_ID = { contains: uarId };
        }
        if (applicationId) {
            whereUar.APPLICATION_ID = applicationId; // Overwrites the 'in'
        }

        const [dataRaw, totalGroups] = await Promise.all([
            prisma.tB_R_UAR_SYSTEM_OWNER.findMany({
                where: whereUar,
                select: {
                    UAR_ID: true,
                    UAR_PERIOD: true,
                    APPLICATION_ID: true,
                    TB_M_APPLICATION: {
                        select: {
                            APPLICATION_NAME: true,
                        },
                    },
                },
                distinct: ["UAR_ID", "UAR_PERIOD", "APPLICATION_ID"],
                orderBy: { UAR_ID: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.tB_R_UAR_SYSTEM_OWNER.groupBy({
                by: ["UAR_ID", "UAR_PERIOD", "APPLICATION_ID"],
                where: whereUar,
            }),
        ]);
        const totalRows = totalGroups.length;

        const uarIds = dataRaw.map((d) => d.UAR_ID);
        const appIds = dataRaw.map((d) => d.APPLICATION_ID as string);

        if (uarIds.length === 0) {
            return { data: [], total: 0, completionStats: [], dateStats: [] };
        }

        // Get completion stats
        const completionStats = await prisma.tB_R_UAR_SYSTEM_OWNER.groupBy({
            by: ['UAR_ID', 'APPLICATION_ID', 'SO_APPROVAL_STATUS'],
            where: {
                UAR_ID: { in: uarIds },
                APPLICATION_ID: { in: appIds }, // Already filtered by ownedApplicationIds
            },
            _count: {
                _all: true
            },
            /*
            select: {
                UAR_ID: true,
                APPLICATION_ID: true,
                SO_APPROVAL_STATUS: true,
                _count: { select: { _all: true } },
                // Get the earliest created date and latest approval date for this group
                // CREATED_DT: true,  <-- REMOVED (ERROR)
                // SO_APPROVAL_DT: true, <-- REMOVED (ERROR)
            }
            */
            // NOTE: The 'select' block is invalid inside a groupBy.
            // The fields from 'by' and the aggregations from '_count'
            // are returned automatically.
        });

        // We need the raw items to find min/max dates
        const dateStats = await prisma.tB_R_UAR_SYSTEM_OWNER.findMany({
            where: {
                UAR_ID: { in: uarIds },
                APPLICATION_ID: { in: appIds },
            },
            select: {
                UAR_ID: true,
                APPLICATION_ID: true,
                SO_APPROVAL_STATUS: true,
                CREATED_DT: true,
                SO_APPROVAL_DT: true,
            }
        });

        // This is a bit complex, let's just use the groupBy result
        // The service layer will have to aggregate dates
        /*
        const remappedStats = completionStats.map(s => ({
           ...s,
           CREATED_DT: new Date(), // Placeholder, service layer should fix
           SO_APPROVAL_DT: null, // Placeholder, service layer should fix
        }));
        */


        return { data: dataRaw, total: totalRows, completionStats: completionStats, dateStats };
    },

    /**
     * Gets details for a specific UAR and Application.
     * Fetches items from TB_R_UAR_SYSTEM_OWNER.
     * Fetches items from TB_R_UAR_DIVISION_USER where their division's workflow is approved.
     */
    async getUarDetails(uarId: string, applicationId: string) {

        // Use a transaction to ensure consistent reads
        return prisma.$transaction(async (tx) => {

            // 1. Get users from System Owner table
            const systemOwnerUsers = tx.tB_R_UAR_SYSTEM_OWNER.findMany({
                where: {
                    UAR_ID: uarId,
                    APPLICATION_ID: applicationId,
                },
                orderBy: {
                    NAME: "asc",
                },
            });

            // 2. Get users from Division User table, IF their division has approved
            const divisionUsers = tx.tB_R_UAR_DIVISION_USER.findMany({
                where: {
                    UAR_ID: uarId,
                    APPLICATION_ID: applicationId,
                    // Relation query: Check if the related TB_M_DIVISION
                    // has any TB_R_WORKFLOW entry for this UAR_ID
                    // that is marked as IS_APPROVED = 'Y'.
                    TB_M_DIVISION: {
                        TB_R_WORKFLOW: {
                            some: {
                                UAR_ID: uarId,
                                IS_APPROVED: "Y",
                            },
                        },
                    },
                },
                orderBy: {
                    NAME: "asc",
                },
            });

            const [soUsers, divUsers] = await Promise.all([systemOwnerUsers, divisionUsers]);

            return {
                systemOwnerUsers: soUsers,
                divisionUsers: divUsers
            };
        });
    },


    /**
     * Batch updates items in the TB_R_UAR_SYSTEM_OWNER table.
     */
    async batchUpdate(
        dto: UarSystemOwnerBatchUpdateDTO,
        userNoreg: string
    ) {
        const { uarId, applicationId, items } = dto;
        const now = await getDbNow();

        const approvedItems = items
            .filter(item => item.decision === "Approved")
            .map(item => ({ USERNAME: item.username, ROLE_ID: item.roleId }));

        const revokedItems = items
            .filter(item => item.decision === "Revoked")
            .map(item => ({ USERNAME: item.username, ROLE_ID: item.roleId }));

        try {
            return await prisma.$transaction(async (tx) => {

                // 1. Update Approved items
                const approveUpdateResult = (approvedItems.length > 0)
                    ? await tx.tB_R_UAR_SYSTEM_OWNER.updateMany({
                        where: {
                            UAR_ID: uarId,
                            APPLICATION_ID: applicationId,
                            OR: approvedItems,
                        },
                        data: {
                            SO_APPROVAL_STATUS: "1", // 'Approve'
                            SO_APPROVAL_BY: userNoreg,
                            SO_APPROVAL_DT: now,
                        },
                    })
                    : { count: 0 };

                // 2. Update Revoked items
                const revokeUpdateResult = (revokedItems.length > 0)
                    ? await tx.tB_R_UAR_SYSTEM_OWNER.updateMany({
                        where: {
                            UAR_ID: uarId,
                            APPLICATION_ID: applicationId,
                            OR: revokedItems,
                        },
                        data: {
                            SO_APPROVAL_STATUS: "2", // 'Revoke'
                            SO_APPROVAL_BY: userNoreg,
                            SO_APPROVAL_DT: now,
                        },
                    })
                    : { count: 0 };

                return {
                    count: approveUpdateResult.count + revokeUpdateResult.count
                };
            });
        } catch (error) {
            console.error("System Owner batch update transaction failed:", error);
            throw new Error("Batch update failed.");
        }
    },
};