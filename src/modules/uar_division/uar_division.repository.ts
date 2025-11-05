
import type { UarDivisionBatchUpdateDTO } from "../../types/uar_division";
import { prisma } from "../../db/prisma";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
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

    async getUar(uarId: string, userDivisionId: number) {
        const [header, details] = await prisma.$transaction([
            prisma.tB_R_WORKFLOW.findFirst({
                where: { UAR_ID: uarId, DIVISION_ID: userDivisionId },
                orderBy: { SEQ_NO: "desc" },
            }),
            prisma.tB_R_UAR_DIVISION_USER.findMany({
                where: { UAR_ID: uarId, DIVISION_ID: userDivisionId },
                orderBy: { NAME: "asc" },
            }),
        ]);

        if (!header && (!details || details.length === 0)) {
            throw new ApplicationError(
                ERROR_CODES.APP_NOT_FOUND,
                "No UAR data found for this ID and your division.",
                { uarId, userDivisionId },
                undefined,
                404
            );
        }

        // Filter detail sesuai department pada header (jika header punya DEPARTMENT_ID)
        const filteredDetails = header?.DEPARTMENT_ID
            ? details.filter(d => d.DEPARTMENT_ID === header.DEPARTMENT_ID)
            : details;

        // === Ambil Department Name untuk header ===
        const department = header?.DEPARTMENT_ID
            ? await prisma.tB_M_EMPLOYEE.findFirst({
                where: { DEPARTMENT_ID: header.DEPARTMENT_ID },
                select: { DEPARTMENT_NAME: true },
            })
            : null;

        const division = header?.DIVISION_ID ? await prisma.tB_M_DIVISION.findFirst({
            where: { DIVISION_ID: header.DIVISION_ID },
            select: { DIVISION_NAME: true }
        }) : null

        // === Ambil SECTION_NAME untuk SETIAP detail (batch, tanpa N+1) ===
        // 1) kumpulkan SECTION_ID unik (buang null)
        const sectionIds = Array.from(
            new Set(filteredDetails.map(d => d.SECTION_ID).filter((v): v is number => v != null))
        );

        // 2) query nama section untuk semua id tsb
        const sectionRows = sectionIds.length
            ? await prisma.tB_M_EMPLOYEE.findMany({
                where: { SECTION_ID: { in: sectionIds } },
                // kalau ada konsep aktif, bisa tambahkan: VALID_TO: null
                select: { SECTION_ID: true, SECTION_NAME: true },
            })
            : [];

        // 3) buat map SECTION_ID -> SECTION_NAME (ambil yang pertama saja)
        const sectionMap = new Map<number, string | null>();
        for (const r of sectionRows) {
            if (r.SECTION_ID != null && !sectionMap.has(r.SECTION_ID)) {
                sectionMap.set(r.SECTION_ID, (r as any).SECTION_NAME ?? null);
            }
        }

        // 4) merge SECTION_NAME ke setiap detail
        const detailsWithSectionName = filteredDetails.map(d => ({
            ...d,
            SECTION_NAME: d.SECTION_ID != null ? sectionMap.get(d.SECTION_ID) ?? null : null,
        }));

        // (opsional) isi SECTION_NAME di header dari salah satu detail (kalau mau)
        // const headerSectionName =
        //     header?.DEPARTMENT_ID && detailsWithSectionName.length
        //         ? detailsWithSectionName[0].SECTION_NAME ?? null
        //         : null;
        const result = {
            header: {
                ...header,
                DEPARTMENT_NAME: department?.DEPARTMENT_NAME ?? null,
                DIVISION_NAME: division?.DIVISION_NAME ?? null,
            },
            details: detailsWithSectionName,
        };
        return result;
    },


    async batchUpdate(
        dto: UarDivisionBatchUpdateDTO,
        userNoreg: string,
        userDivisionId: number
    ) {
        const { uarId, decision, items, comments } = dto;
        const now = await getDbNow();
        const divApprovalStatus = decision === "Approve" ? "1" : "2";

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