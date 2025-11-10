
import type { UarDivisionBatchUpdateDTO } from "../../types/uar_division";
import { prisma } from "../../db/prisma";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
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

export const uarDivisionRepository = {
    async listUars(params: {
        page: number;
        limit: number;
        period?: string;
        uarId?: string;
        status?: 'InProgress' | 'Finished';
        createdDate?: string;
        completedDate?: string;
        noreg?: string;
        departmentId?: number;
        reviewStatus?: 'pending';

    }) {
        const {
            page, limit, period, uarId,
            status, createdDate, completedDate, reviewStatus, departmentId, noreg
        } = params;

        let workflowFilteredUarIds: string[] | undefined = undefined;
        const whereWorkflow: any = {
            DEPARTMENT_ID: departmentId,
        };
        const dbPeriod = period ? period.replace('-', '') : undefined;
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
                return { data: [], total: 0, workflowStatus: [], completionStats: [] };
            }
        }

        let inProgressUarIds: string[] | undefined;
        if (status) {
            const whereStatus: any = {
                DEPARTMENT_ID: departmentId,
                OR: [
                    { DIV_APPROVAL_STATUS: '0' },
                ]
            };

            if (workflowFilteredUarIds) {
                whereStatus.UAR_ID = { in: workflowFilteredUarIds };
            }

            const inProgressUars = await prisma.tB_R_UAR_DIVISION_USER.findMany({
                where: whereStatus,
                select: { UAR_ID: true },
                distinct: ['UAR_ID']
            });
            inProgressUarIds = inProgressUars.map(u => u.UAR_ID);

            if (status === 'InProgress' && inProgressUarIds.length === 0) {
                return { data: [], total: 0, workflowStatus: [], completionStats: [] };
            }
        }

        const whereUar: any = {
            DEPARTMENT_ID: departmentId,
            REVIEWER_NOREG: noreg

        };
        if (dbPeriod) {
            whereUar.UAR_PERIOD = dbPeriod;
        }

        const uarIdFilter: any = {};
        if (uarId) {
            uarIdFilter.contains = uarId;
        }

        if (workflowFilteredUarIds) {
            uarIdFilter.in = workflowFilteredUarIds;
        }


        if (status && inProgressUarIds) {
            if (status === 'InProgress') {
                if (uarIdFilter.in) {
                    const inProgressSet = new Set(inProgressUarIds);
                    uarIdFilter.in = uarIdFilter.in.filter((id: string) => inProgressSet.has(id));
                } else {
                    uarIdFilter.in = inProgressUarIds;
                }
            } else { // 'Finished'
                const inProgressSet = new Set(inProgressUarIds);
                if (uarIdFilter.in) {
                    // Difference: UAR must be in date list but NOT in inProgress list
                    uarIdFilter.in = uarIdFilter.in.filter((id: string) => !inProgressSet.has(id));
                } else {
                    // No date filter, just use notIn
                    uarIdFilter.notIn = inProgressUarIds;
                }
            }
        }

        if (reviewStatus === 'pending') {
            whereUar.REVIEW_STATUS = null
        }

        if (Object.keys(uarIdFilter).length > 0) {
            whereUar.UAR_ID = uarIdFilter;
        }

        // If filters combined to produce an empty list, stop.
        if (uarIdFilter.in && uarIdFilter.in.length === 0) {
            return { data: [], total: 0, workflowStatus: [], completionStats: [] };
        }


        // --- 5. EXECUTE MAIN QUERY (WITH PAGINATION) ---
        const [dataRaw, totalGroups] = await Promise.all([
            prisma.tB_R_UAR_DIVISION_USER.findMany({
                where: whereUar, // This now contains all filters
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
                take: limit, // Limit is applied here, AFTER filtering
            }),
            prisma.tB_R_UAR_DIVISION_USER.groupBy({
                by: ["UAR_ID", "UAR_PERIOD"],
                where: whereUar, // Same filters to get accurate total
            }),
        ]);

        const totalRows = totalGroups.length;

        const uarIds = dataRaw.map((d) => d.UAR_ID);
        if (uarIds.length === 0) {
            return { data: [], total: 0, workflowStatus: [], completionStats: [] };
        }

        // --- 6. GET DATA FOR THE PAGINATED RESULTS ---
        const [workflowStatus, completionStats] = await Promise.all([
            prisma.tB_R_WORKFLOW.findMany({
                where: {
                    UAR_ID: { in: uarIds }, // Only get wf data for the 10 on the page
                    DEPARTMENT_ID: departmentId,
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
                    DEPARTMENT_ID: departmentId
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

        const filteredDetails = header?.DEPARTMENT_ID
            ? details.filter(d => d.DEPARTMENT_ID === header.DEPARTMENT_ID)
            : details;

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

        const employee = header?.APPROVER_NOREG ? await prisma.tB_M_EMPLOYEE.findFirst({
            where: { NOREG: header.APPROVER_NOREG },
            select: { PERSONNEL_NAME: true }
        }) : null

        const sectionIds = Array.from(
            new Set(filteredDetails.map(d => d.SECTION_ID).filter((v): v is number => v != null))
        );

        const sectionRows = sectionIds.length
            ? await prisma.tB_M_EMPLOYEE.findMany({
                where: { SECTION_ID: { in: sectionIds } },
                select: { SECTION_ID: true, SECTION_NAME: true },
            })
            : [];

        const sectionMap = new Map<number, string | null>();
        for (const r of sectionRows) {
            if (r.SECTION_ID != null && !sectionMap.has(r.SECTION_ID)) {
                sectionMap.set(r.SECTION_ID, (r as any).SECTION_NAME ?? null);
            }
        }

        const departmentIds = Array.from(
            new Set(filteredDetails.map(d => d.DEPARTMENT_ID).filter((v): v is number => v != null))
        );

        const departmentRows = departmentIds.length
            ? await prisma.tB_M_EMPLOYEE.findMany({
                where: { DEPARTMENT_ID: { in: departmentIds } },
                select: { DEPARTMENT_ID: true, DEPARTMENT_NAME: true },
            })
            : [];

        const departmentMap = new Map<number, string | null>();
        for (const r of departmentRows) {
            if (r.DEPARTMENT_ID != null && !departmentMap.has(r.DEPARTMENT_ID)) {
                departmentMap.set(r.DEPARTMENT_ID, (r as any).DEPARTMENT_NAME ?? null);
            }
        }

        const employeeNameDetailIds = Array.from(
            new Set(filteredDetails.map(d => d.NOREG).filter((v): v is string => v != null))
        );

        const employeeNameDetailRows = departmentIds.length
            ? await prisma.tB_M_EMPLOYEE.findMany({
                where: { NOREG: { in: employeeNameDetailIds } },
                select: { NOREG: true, PERSONNEL_NAME: true },
            })
            : [];

        const EmployeeNameMap = new Map<string, string | null>();
        for (const r of employeeNameDetailRows) {
            if (r.NOREG != null && !EmployeeNameMap.has(r.NOREG)) {
                EmployeeNameMap.set(r.NOREG, (r as any).PERSONNEL_NAME ?? null);
            }
        }
        const detailsWithSectionName = filteredDetails.map(d => ({
            ...d,
            SECTION_NAME: d.SECTION_ID != null ? sectionMap.get(d.SECTION_ID) ?? null : null,
            DEPARTMENT_NAME: d.DEPARTMENT_ID != null ? departmentMap.get(d.DEPARTMENT_ID) ?? null : null,
            PERSONNEL_NAME: d.NOREG != null ? EmployeeNameMap.get(d.NOREG) ?? null : null,
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
                PERONNEL_NAME: employee?.PERSONNEL_NAME ?? null,
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
        const { uarId, items, comments } = dto;
        const now = await getDbNow();

        const approvedItems = items
            .filter(item => item.decision === "Approved")
            .map(item => ({ USERNAME: item.username, ROLE_ID: item.roleId }));

        const revokedItems = items
            .filter(item => item.decision === "Revoked")
            .map(item => ({ USERNAME: item.username, ROLE_ID: item.roleId }));

        try {
            return await prisma.$transaction(async (tx) => {

                const approveUpdateResult = (approvedItems.length > 0)
                    ? await tx.tB_R_UAR_DIVISION_USER.updateMany({
                        where: {
                            UAR_ID: uarId,
                            DIVISION_ID: userDivisionId,
                            OR: approvedItems,
                        },
                        data: {
                            DIV_APPROVAL_STATUS: "1",
                            REVIEWED_BY: userNoreg,
                            REVIEWED_DT: now,
                        },
                    })
                    : { count: 0 }; // Default result if none

                const revokeUpdateResult = (revokedItems.length > 0)
                    ? await tx.tB_R_UAR_DIVISION_USER.updateMany({
                        where: {
                            UAR_ID: uarId,
                            DIVISION_ID: userDivisionId,
                            OR: revokedItems,
                        },
                        data: {
                            DIV_APPROVAL_STATUS: "2",
                            REVIEWED_BY: userNoreg,
                            REVIEWED_DT: now,
                        },
                    })
                    : { count: 0 };

                const userUpdateResult = {
                    count: approveUpdateResult.count + revokeUpdateResult.count
                };

                const allItemsInUar = await tx.tB_R_UAR_DIVISION_USER.findMany({
                    where: { UAR_ID: uarId, DIVISION_ID: userDivisionId, },
                    select: { DIV_APPROVAL_STATUS: true, },
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