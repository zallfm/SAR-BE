import type { UarSystemOwnerBatchUpdateDTO } from "../../types/uar_system_owner";
import { prisma } from "../../db/prisma";
import { Prisma } from "../../generated/prisma/index.js";

async function getDbNow(): Promise<Date> {
    const rows: Array<{ now: Date }> = await prisma.$queryRaw`SELECT GETDATE() AS now`;
    return rows[0]?.now ?? new Date();
}

function createFullDayFilter(dateString: string) {
    const date = new Date(dateString);
    const gte = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const lt = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return { gte, lt };
}


export const uarSystemOwnerRepository = {


    async findAppsByOwner(noreg: string) {
        return prisma.tB_M_APPLICATION.findMany({
            where: {
                NOREG_SYSTEM_OWNER: noreg,
                APPLICATION_STATUS: '0'
            },
            select: {
                APPLICATION_ID: true,
                APPLICATION_NAME: true,
            }
        });
    },


    async listUars(params: {
        page: number;
        limit: number;
        period?: string;
        uarId?: string;
        applicationId?: string;
        status?: 'InProgress' | 'Finished';
        createdDate?: string;
        completedDate?: string;
        divisionId?: number;
        reviewStatus?: 'pending';
        noreg?: string;
    }) {
        const {
            page, limit, period, uarId,
            status, createdDate, completedDate, divisionId, reviewStatus, noreg
        } = params;


        let workflowFilteredUarIds: string[] | undefined = undefined;
        const whereWorkflow: any = {
            DIVISION_ID: divisionId, // <-- Using divisionId
        };
        const hasWorkflowFilter = createdDate || completedDate;

        if (createdDate) {
            whereWorkflow.CREATED_DT = createFullDayFilter(createdDate);
        }
        if (completedDate) {
            whereWorkflow.APPROVED_DT = createFullDayFilter(completedDate);
        }

        if (hasWorkflowFilter) {
            const workflowUars = await prisma.tB_R_WORKFLOW.findMany({
                where: whereWorkflow,
                select: { UAR_ID: true },
                distinct: ['UAR_ID']
            });
            workflowFilteredUarIds = workflowUars.map(w => w.UAR_ID);

            if (workflowFilteredUarIds.length === 0) {
                // Early exit if date filters match nothing
                return { data: [], total: 0, completionStats: [], dateStats: [], divisionStats: [] };
            }
        }

        let inProgressUarIds: string[] | undefined;
        if (status) {
            const whereStatus: any = {
                DIVISION_ID: divisionId,
                SO_APPROVAL_STATUS: '0',
            };

            if (workflowFilteredUarIds) {
                whereStatus.UAR_ID = { in: workflowFilteredUarIds };
            }

            // 1. Find pending UARs in the DIVISION_USER table
            const inProgressDuPromise = prisma.tB_R_UAR_DIVISION_USER.findMany({
                where: whereStatus,
                select: { UAR_ID: true },
                distinct: ['UAR_ID']
                
            });

            // 2. Find pending UARs in the SYSTEM_OWNER table
            // (Note: Schema shows SO_APPROVAL_STATUS is nullable here)
            const whereStatusSo: any = {
                DIVISION_ID: divisionId,
                OR: [
                    { SO_APPROVAL_STATUS: '0' },
                    { SO_APPROVAL_STATUS: null } 
                ]
            };

            if (workflowFilteredUarIds) {
                whereStatusSo.UAR_ID = { in: workflowFilteredUarIds };
            }

            const inProgressSoPromise = prisma.tB_R_UAR_SYSTEM_OWNER.findMany({
                where: whereStatusSo,
                select: { UAR_ID: true },
                distinct: ['UAR_ID']
            });

            // 3. Combine the lists
            const [inProgressDu, inProgressSo] = await Promise.all([
                inProgressDuPromise,
                inProgressSoPromise
            ]);

            // Use a Set to get unique UAR IDs from both queries
            const inProgressSet = new Set([
                ...inProgressDu.map(u => u.UAR_ID),
                ...inProgressSo.map(u => u.UAR_ID)
            ]);

            inProgressUarIds = Array.from(inProgressSet);
            if (status === 'InProgress' && inProgressUarIds.length === 0) {
                return { data: [], total: 0, completionStats: [], dateStats: [], divisionStats: [] };
            }
        }

        // This object will hold the UAR_ID list filters derived from the logic above
        const uarIdFilter: { in?: string[], notIn?: string[] } = {};

        if (workflowFilteredUarIds) {
            uarIdFilter.in = workflowFilteredUarIds;
        }

        if (status && inProgressUarIds) {
            if (status === 'InProgress') {
                if (uarIdFilter.in) {
                    // Intersect: UARs must match dates AND be in progress
                    const inProgressSet = new Set(inProgressUarIds);
                    uarIdFilter.in = uarIdFilter.in.filter((id: string) => inProgressSet.has(id));
                } else {
                    // No date filter, just use in progress list
                    uarIdFilter.in = inProgressUarIds;
                }
            } else { // 'Finished'
                const inProgressSet = new Set(inProgressUarIds);
                if (uarIdFilter.in) {
                    // Difference: UARs must match dates AND NOT be in progress
                    uarIdFilter.in = uarIdFilter.in.filter((id: string) => !inProgressSet.has(id));
                } else {
                    // No date filter, just use notIn
                    uarIdFilter.notIn = inProgressUarIds;
                }
            }
        }

        // If the filters combined to produce an empty 'in' list, exit.
        if (uarIdFilter.in && uarIdFilter.in.length === 0) {
            return { data: [], total: 0, completionStats: [], dateStats: [], divisionStats: [] };
        }
        // 2. BUILD SQL 'WHERE' FOR SYSTEM_OWNER (SO)
        // This clause INCLUDES the application ID filters
        const conditionsSO: Prisma.Sql[] = [];


        if (period) {
            conditionsSO.push(Prisma.sql`UAR_PERIOD = ${period}`);
        }

        if (uarId) {
            conditionsSO.push(Prisma.sql`UAR_ID LIKE ${'%' + uarId + '%'}`);
        }

        if (uarIdFilter.in) {
            conditionsSO.push(Prisma.sql`UAR_ID IN (${Prisma.join(uarIdFilter.in)})`);
        } else if (uarIdFilter.notIn && uarIdFilter.notIn.length > 0) {
            conditionsSO.push(Prisma.sql`UAR_ID NOT IN (${Prisma.join(uarIdFilter.notIn)})`);
        }

        if (divisionId) {
            conditionsSO.push(Prisma.sql`DIVISION_ID = ${divisionId}`);
        }
        if (reviewStatus === 'pending') {
            // Data yang belum direview → kolom REVIEW_STATUS masih kosong
            conditionsSO.push(Prisma.sql`REVIEW_STATUS IS NULL`);
        } else if (reviewStatus === 'reviewed') {
            // Data yang sudah direview → kolom REVIEW_STATUS sudah terisi
            conditionsSO.push(Prisma.sql`REVIEW_STATUS IS NOT NULL`);
        }
        if (noreg) {
            conditionsSO.push(Prisma.sql`REVIEWER_NOREG = ${noreg}`);
        }
        const whereSql_SO = conditionsSO.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(conditionsSO, ' AND ')}`
            : Prisma.empty;

        // 3. BUILD SQL 'WHERE' FOR DIVISION_USER (DU)
        // This clause EXCLUDES the application ID filters
        const conditionsDU: Prisma.Sql[] = [];
        conditionsDU.push(Prisma.sql`(DIV_APPROVAL_STATUS != '0' OR DIV_APPROVAL_STATUS IS NULL)`);
        if (period) {
            conditionsDU.push(Prisma.sql`UAR_PERIOD = ${period}`);
        }
        if (uarId) {
            conditionsDU.push(Prisma.sql`UAR_ID LIKE ${'%' + uarId + '%'}`);
        }

        if (uarIdFilter.in) {
            conditionsDU.push(Prisma.sql`UAR_ID IN (${Prisma.join(uarIdFilter.in)})`);
        } else if (uarIdFilter.notIn && uarIdFilter.notIn.length > 0) {
            conditionsDU.push(Prisma.sql`UAR_ID NOT IN (${Prisma.join(uarIdFilter.notIn)})`);
        }

        if (divisionId) {
            conditionsDU.push(Prisma.sql`DIVISION_ID = ${divisionId}`);
        }
        if (reviewStatus === 'pending') {
            conditionsDU.push(Prisma.sql`REVIEW_STATUS IS NULL`);
        }
        if (noreg) {
            conditionsDU.push(Prisma.sql`REVIEWER_NOREG = ${noreg}`);
        }

        const whereSql_DU = conditionsDU.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(conditionsDU, ' AND ')}`
            : Prisma.empty;


        const allUarsSql = Prisma.sql`
            SELECT UAR_ID, UAR_PERIOD, APPLICATION_ID, 'SYSTEM_OWNER' as source_flag
            FROM TB_R_UAR_SYSTEM_OWNER
            ${whereSql_SO} 
            
            UNION ALL
            
            SELECT UAR_ID, UAR_PERIOD, APPLICATION_ID, 'DIVISION_USER' as source_flag
            FROM TB_R_UAR_DIVISION_USER
            ${whereSql_DU}
        `;

        // 3. --- MODIFIED: Build the final queries with 'WITH' at the top ---
        const offset = (page - 1) * limit;

        const dataQuerySql = Prisma.sql`
            WITH AllUARs AS (
                ${allUarsSql}
            ),
            GroupedUARs AS (
                SELECT
                    UAR_ID, UAR_PERIOD, APPLICATION_ID,
                    STRING_AGG(source_flag, ',') WITHIN GROUP (ORDER BY source_flag) as source
                FROM AllUARs
                GROUP BY UAR_ID, UAR_PERIOD, APPLICATION_ID
            )
            SELECT T.*, A.APPLICATION_NAME
            FROM GroupedUARs AS T
            LEFT JOIN TB_M_APPLICATION AS A ON T.APPLICATION_ID = A.APPLICATION_ID
            ORDER BY T.UAR_ID DESC
            OFFSET ${offset} ROWS
            FETCH NEXT ${limit} ROWS ONLY
        `;

        const countQuerySql = Prisma.sql`
            WITH AllUARs AS (
                ${allUarsSql}
            )
            SELECT COUNT(*) as count
            FROM (
                -- We only need to group to get the distinct UARs for the count
                SELECT UAR_ID, UAR_PERIOD, APPLICATION_ID
                FROM AllUARs
                GROUP BY UAR_ID, UAR_PERIOD, APPLICATION_ID
            ) as SubQuery
        `;
        const [dataRawResults, totalGroups] = await Promise.all([
            prisma.$queryRaw<Array<{
                UAR_ID: string;
                UAR_PERIOD: string;
                APPLICATION_ID: string;
                APPLICATION_NAME: string;
                source: string; // The new flag field
            }>>(dataQuerySql), // Use the new query variable

            // Query for the total count
            prisma.$queryRaw<Array<{ count: number }>>(countQuerySql) // Use the new query variable
        ]);

        const totalRows = totalGroups[0]?.count ?? 0;

        // 5. --- (Unchanged) Map the results ---
        const dataRaw = dataRawResults.map(row => ({
            UAR_ID: row.UAR_ID,
            UAR_PERIOD: row.UAR_PERIOD,
            APPLICATION_ID: row.APPLICATION_ID,
            source: row.source, // Add the source field
            TB_M_APPLICATION: {
                APPLICATION_NAME: row.APPLICATION_NAME
            }
        }));
        const uarIds = dataRaw.map((d) => d.UAR_ID);
        const appIds = dataRaw.map((d) => d.APPLICATION_ID as string);

        if (uarIds.length === 0) {
            return { data: [], total: 0, completionStats: [], dateStats: [], divisionStats: [] };
        }

        const [completionStats, dateStats, divisionStats, dateStatsDU] = await Promise.all([
            prisma.tB_R_UAR_SYSTEM_OWNER.groupBy({
                by: ['UAR_ID', 'APPLICATION_ID', 'SO_APPROVAL_STATUS'],
                where: {
                    UAR_ID: { in: uarIds },
                    APPLICATION_ID: { in: appIds },
                },
                _count: { _all: true },

            }),

            prisma.tB_R_UAR_SYSTEM_OWNER.findMany({
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
            }),

            prisma.tB_R_UAR_DIVISION_USER.groupBy({
                by: ['UAR_ID', 'APPLICATION_ID', 'SO_APPROVAL_STATUS'],
                where: {
                    UAR_ID: { in: uarIds },
                    APPLICATION_ID: { in: appIds },
                },
                _count: { _all: true },
            }),

            prisma.tB_R_UAR_DIVISION_USER.findMany({
                where: {
                    UAR_ID: { in: uarIds },
                    APPLICATION_ID: { in: appIds },
                },
                select: {
                    UAR_ID: true,
                    APPLICATION_ID: true,
                    CREATED_DT: true,
                }
            })
        ]);

        const mappedDateStatsDU = dateStatsDU.map(du => ({
            UAR_ID: du.UAR_ID,
            APPLICATION_ID: du.APPLICATION_ID,
            CREATED_DT: du.CREATED_DT,
            SO_APPROVAL_STATUS: null,
            SO_APPROVAL_DT: null,
        }));

        const combinedDateStats = [
            ...dateStats,
            ...mappedDateStatsDU
        ];

        // console.log("DATESTATS", combinedDateStats)
        return {
            data: dataRaw,
            total: totalRows,
            completionStats,
            dateStats: combinedDateStats,
            divisionStats
        };
    },

    async getUarDetails(uarId: string, applicationId: string) {

        return prisma.$transaction(async (tx) => {

            const systemOwnerUsers = tx.tB_R_UAR_SYSTEM_OWNER.findMany({
                where: {
                    UAR_ID: uarId,
                    APPLICATION_ID: applicationId,
                },
                include: {
                    TB_M_COMMENT_SYSTEM_OWNER: {
                        orderBy: { CREATED_DT: 'asc' }
                    }
                },
                orderBy: {
                    NAME: "asc",
                },
            });

            const divisionUsers = tx.tB_R_UAR_DIVISION_USER.findMany({
                where: {
                    UAR_ID: uarId,
                    APPLICATION_ID: applicationId,
                    TB_M_DIVISION: {
                        TB_R_WORKFLOW: {
                            some: {
                                UAR_ID: uarId,
                                IS_APPROVED: "Y",
                            },
                        },
                    },
                },
                include: {
                    TB_M_COMMENT_DIVISION_USER: {
                        orderBy: { CREATED_DT: 'asc' }
                    }
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

    getUarSo(uarId: string, applicationId: string) {
        return prisma.$transaction(async (tx) => {
            // ===== DETAILS =====
            const systemOwnerUsersPromise = tx.tB_R_UAR_SYSTEM_OWNER.findMany({
                where: { UAR_ID: uarId, APPLICATION_ID: applicationId },
                include: {
                    TB_M_COMMENT_SYSTEM_OWNER: { orderBy: { CREATED_DT: 'asc' } },
                },
                orderBy: { NAME: 'asc' },
            });

            const divisionUsersPromise = tx.tB_R_UAR_DIVISION_USER.findMany({
                where: {
                    UAR_ID: uarId,
                    APPLICATION_ID: applicationId,
                    TB_M_DIVISION: {
                        TB_R_WORKFLOW: { some: { UAR_ID: uarId, IS_APPROVED: 'Y' } },
                    },
                },
                include: {
                    TB_M_COMMENT_DIVISION_USER: { orderBy: { CREATED_DT: 'asc' } },
                },
                orderBy: { NAME: 'asc' },
            });

            // ===== APP NAME (untuk header) =====
            const appPromise = tx.tB_M_APPLICATION.findUnique({
                where: { APPLICATION_ID: applicationId },
                select: { APPLICATION_ID: true, APPLICATION_NAME: true, DIVISION_ID_OWNER: true },
            });

            const [soUsers, divUsers, app] = await Promise.all([
                systemOwnerUsersPromise,
                divisionUsersPromise,
                appPromise,
            ]);
            // console.log("soUsers",soUsers)
            const divisionIds = Array.from(
                new Set(
                    [...soUsers, ...divUsers]
                        .map((u) => u.DIVISION_ID)
                        .filter((v): v is number => v !== null && v !== undefined)
                )
            );

            const divisions = divisionIds.length
                ? await tx.tB_M_DIVISION.findMany({
                    where: { DIVISION_ID: { in: divisionIds } },
                    select: { DIVISION_ID: true, DIVISION_NAME: true },
                })
                : [];

            const divMap = new Map(
                divisions.map((d) => [d.DIVISION_ID, d.DIVISION_NAME])
            );

            const soUsersWithDivisionName = soUsers.map((u) => ({
                ...u,
                DIVISION_NAME: u.DIVISION_ID
                    ? divMap.get(u.DIVISION_ID) ?? null
                    : null,
            }));

            const divUsersWithDivisionName = divUsers.map((u) => ({
                ...u,
                DIVISION_NAME: divMap.get(u.DIVISION_ID) ?? null,
            }));

            // divisiona_name
            const division = app?.DIVISION_ID_OWNER ? await tx.tB_M_DIVISION.findUnique({
                where: { DIVISION_ID: app.DIVISION_ID_OWNER },
                select: { DIVISION_NAME: true, DIVISION_ID: true }
            }) : null

            // department
            const wf = await tx.tB_R_WORKFLOW.findFirst({
                where: { UAR_ID: uarId },
                select: { DEPARTMENT_ID: true },
            });
            const departmentId = wf?.DEPARTMENT_ID ?? null;
            const depertmenName = departmentId ? await tx.tB_M_EMPLOYEE.findFirst({
                where: { DEPARTMENT_ID: departmentId },
                select: { DEPARTMENT_NAME: true }
            }) : null
            // ===== HEADER BUILDER =====
            const uarPeriod =
                soUsers[0]?.UAR_PERIOD ??
                divUsers[0]?.UAR_PERIOD ??
                null;

            const allRows = [...soUsers, ...divUsers];

            // createdDate = tanggal paling awal dari semua baris
            const createdDate =
                allRows
                    .map((u) => u.CREATED_DT)
                    .filter(Boolean)
                    .sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

            // definisi selesai (silakan sesuaikan bila perlu)
            const isDone = (u: any) => {
                const yes = new Set(['Y', 'YES', 'APPROVED', 'DONE', 'COMPLETED']);
                return (
                    yes.has(String(u.REVIEW_STATUS ?? '').toUpperCase()) ||
                    yes.has(String(u.SO_APPROVAL_STATUS ?? '').toUpperCase()) ||
                    yes.has(String(u.REMEDIATED_STATUS ?? '').toUpperCase())
                );
            };

            const total = allRows.length;
            const done = allRows.filter(isDone).length;
            const percent = total > 0 ? Math.floor((done / total) * 100) : 0;
            const percentComplete = `${percent}% (${done} of ${total})`;

            // completedDate = kalau semua selesai → ambil tanggal aksi terbaru
            const completedDate =
                done === total && total > 0
                    ? allRows
                        .map(
                            (u) =>
                                u.REMEDIATED_DT ??
                                // u.SO_APPROVAL_DT ??
                                u.REVIEWED_DT ??
                                u.CHANGED_DT ??
                                u.CREATED_DT
                        )
                        .filter(Boolean)
                        .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
                    : null;

            // status sederhana: 0 (belum), 1 (progres), 2 (complete)
            const status =
                total === 0 ? '0' : done === 0 ? '0' : done === total ? '2' : '1';

            const header = {
                uarId,
                uarPeriod,
                applicationId,
                applicationName: app?.APPLICATION_NAME ?? null,
                divisionName: division?.DIVISION_NAME ?? null,
                departmentName: depertmenName?.DEPARTMENT_NAME ?? null,
                percentComplete,
                createdDate,
                completedDate,
                status,
            };
            // console.log("header", header)

            // ===== RETURN: tetap kompatibel dengan service =====
            return {
                header,                 // <-- tambahan (service kamu akan mengabaikan jika tidak dipass)
                systemOwnerUsers: soUsersWithDivisionName,
                divisionUsers: divUsersWithDivisionName,
            };
        });
    },



    async batchUpdate(
        dto: UarSystemOwnerBatchUpdateDTO,
        userNoreg: string
    ) {
        const { uarId, applicationId, items, comments } = dto;
        const now = await getDbNow();

        const approvedItems = items
            .filter(item => item.decision === "Approved")
            .map(item => ({ USERNAME: item.username, ROLE_ID: item.roleId }));

        const revokedItems = items
            .filter(item => item.decision === "Revoked")
            .map(item => ({ USERNAME: item.username, ROLE_ID: item.roleId }));

        const hasComment = comments && comments.trim().length > 0;

        try {
            return await prisma.$transaction(async (tx) => {

                const commenter = await tx.tB_M_EMPLOYEE.findFirst({
                    where: {
                        NOREG: userNoreg,
                        VALID_TO: { gte: now }
                    },
                    select: { PERSONNEL_NAME: true }
                });
                const commenterName = commenter?.PERSONNEL_NAME ?? null;

                let uarPeriod: string | null = null;
                if (hasComment && items.length > 0) {
                    const firstItem = items[0];
                    const uarRecord = await tx.tB_R_UAR_SYSTEM_OWNER.findFirst({
                        where: {
                            UAR_ID: uarId,
                            APPLICATION_ID: applicationId,
                            USERNAME: firstItem.username,
                            ROLE_ID: firstItem.roleId
                        },
                        select: { UAR_PERIOD: true }
                    });

                    if (!uarRecord) {
                        throw new Error(`Could not find UAR Period for UAR_ID ${uarId} to save comment.`);
                    }
                    uarPeriod = uarRecord.UAR_PERIOD;
                }

                const approveUpdateResult = (approvedItems.length > 0)
                    ? await tx.tB_R_UAR_SYSTEM_OWNER.updateMany({
                        where: {
                            UAR_ID: uarId,
                            APPLICATION_ID: applicationId,
                            OR: approvedItems,
                        },
                        data: {
                            SO_APPROVAL_STATUS: "1",
                            SO_APPROVAL_BY: userNoreg,
                            SO_APPROVAL_DT: now,
                        },
                    })
                    : { count: 0 };

                const revokeUpdateResult = (revokedItems.length > 0)
                    ? await tx.tB_R_UAR_SYSTEM_OWNER.updateMany({
                        where: {
                            UAR_ID: uarId,
                            APPLICATION_ID: applicationId,
                            OR: revokedItems,
                        },
                        data: {
                            SO_APPROVAL_STATUS: "2",
                            SO_APPROVAL_BY: userNoreg,
                            SO_APPROVAL_DT: now,
                        },
                    })
                    : { count: 0 };

                if (hasComment && uarPeriod) {
                    const commentData = items.map(item => ({
                        COMMENT_TEXT: comments,
                        COMMENTER_ID: userNoreg,
                        COMMENTER_NAME: commenterName,
                        UAR_PERIOD: uarPeriod!,
                        UAR_ID: uarId,
                        USERNAME: item.username,
                        ROLE_ID: item.roleId,
                    }));

                    await tx.tB_M_COMMENT_SYSTEM_OWNER.createMany({
                        data: commentData,
                    });
                }

                return {
                    count: approveUpdateResult.count + revokeUpdateResult.count
                };
            });
        } catch (error) {
            console.error("System Owner batch update transaction failed:", error);
            if (error instanceof Error) {
                throw new Error(`Batch update failed: ${error.message}`);
            }
            throw new Error("Batch update failed.");
        }
    },

    async addComment(
        dto: {
            uarId: string,
            applicationId: string,
            comments: string,
            // The items to attach the comment to
            items: Array<{ username: string, roleId: string }>
        },
        userNoreg: string
    ) {
        const { uarId, applicationId, items, comments } = dto;

        // We must have at least one item to link the comment to
        if (!items || items.length === 0) {
            throw new Error("No items selected to add a comment.");
        }

        try {
            return await prisma.$transaction(async (tx) => {
                // 1. Get Commenter Name
                const now = await getDbNow();
                const commenter = await tx.tB_M_EMPLOYEE.findFirst({
                    where: {
                        NOREG: userNoreg,
                        VALID_TO: { gte: now } // Find active employee record
                    },
                    select: { PERSONNEL_NAME: true }
                });
                const commenterName = commenter?.PERSONNEL_NAME ?? null;

                // 2. Get UAR_PERIOD from the first item
                // (We assume all items in the batch share the same period)
                const firstItem = items[0];
                const uarRecord = await tx.tB_R_UAR_SYSTEM_OWNER.findFirst({
                    where: {
                        UAR_ID: uarId,
                        APPLICATION_ID: applicationId,
                        USERNAME: firstItem.username,
                        ROLE_ID: firstItem.roleId
                    },
                    select: { UAR_PERIOD: true }
                });

                if (!uarRecord) {
                    throw new Error(`Could not find UAR Period for UAR_ID ${uarId} to save comment.`);
                }
                const uarPeriod = uarRecord.UAR_PERIOD;

                // 3. Prepare comment data for all selected items
                const commentData = items.map(item => ({
                    COMMENT_TEXT: comments,
                    COMMENTER_ID: userNoreg,
                    COMMENTER_NAME: commenterName,
                    UAR_PERIOD: uarPeriod,
                    UAR_ID: uarId,
                    USERNAME: item.username,
                    ROLE_ID: item.roleId,
                }));

                return tx.tB_M_COMMENT_SYSTEM_OWNER.createMany({
                    data: commentData,
                });
            });
        } catch (error) {
            console.error("System Owner add comment transaction failed:", error);
            if (error instanceof Error) {
                throw new Error(`Add comment failed: ${error.message}`);
            }
            throw new Error("Add comment failed.");
        }
    },
};