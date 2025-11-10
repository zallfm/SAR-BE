import type { UarSystemOwnerBatchUpdateDTO } from "../../types/uar_system_owner";
import { prisma } from "../../db/prisma";

async function getDbNow(): Promise<Date> {
    const rows: Array<{ now: Date }> = await prisma.$queryRaw`SELECT GETDATE() AS now`;
    return rows[0]?.now ?? new Date();
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
        ownedApplicationIds: string[];
        period?: string;
        uarId?: string;
        applicationId?: string;
    }) {
        const { page, limit, ownedApplicationIds, period, uarId, applicationId } = params;

        const pendingDivisionUars = await prisma.tB_R_UAR_DIVISION_USER.groupBy({
            by: ['UAR_ID', 'APPLICATION_ID'],
            where: {
                DIV_APPROVAL_STATUS: '0',

                APPLICATION_ID: applicationId ? applicationId : { in: ownedApplicationIds },
                ...(period && { UAR_PERIOD: period }),
                ...(uarId && { UAR_ID: { contains: uarId } }),
            },
        });

        const excludeList = pendingDivisionUars.map(p => ({
            UAR_ID: p.UAR_ID,
            APPLICATION_ID: p.APPLICATION_ID ?? undefined,
        }));


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
            whereUar.APPLICATION_ID = applicationId;
        }

        if (excludeList.length > 0) {
            whereUar.NOT = excludeList.map(ex => ({
                AND: [
                    { UAR_ID: ex.UAR_ID },
                    { APPLICATION_ID: ex.APPLICATION_ID }
                ]
            }));
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

        const completionStats = await prisma.tB_R_UAR_SYSTEM_OWNER.groupBy({
            by: ['UAR_ID', 'APPLICATION_ID', 'SO_APPROVAL_STATUS'],
            where: {
                UAR_ID: { in: uarIds },
                APPLICATION_ID: { in: appIds },
            },
            _count: {
                _all: true
            },
        });

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

        return { data: dataRaw, total: totalRows, completionStats: completionStats, dateStats };
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