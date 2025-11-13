import { prisma } from "../../db/prisma";
import { Prisma } from "../../generated/prisma/index.js";

export interface UarChartParams {
    period?: string;
    divisionId?: number;
    departmentId?: number;
    applicationId?: string;
}

interface UarOverallStats {
    total: number;
    reviewed: {
        count: number;
        percentage: number;
    };
    divApproved: {
        count: number;
        percentage: number;
    };
    soApproved: {
        count: number;
        percentage: number;
    };
    completed: {
        count: number;
        percentage: number;
    };
}

interface UarStatsByDivision {
    divisionId: number;
    divisionName: string;
    total: number;
    reviewedCount: number;
    divApprovedCount: number;
    soApprovedCount: number;
    completedCount: number;
}


interface UarStatsByApplication {
    applicationId: string;
    applicationName: string;
    total: number;
    reviewedCount: number;
    divApprovedCount: number;
    soApprovedCount: number;
    completedCount: number;
}


function calculatePercentage(count: number, total: number): number {
    if (total === 0) {
        return 0;
    }
    return (count / total) * 100;
}


function buildUarWhereClauses(params: UarChartParams) {
    const { period, divisionId, departmentId, applicationId } = params;

    const conditionsDU: Prisma.Sql[] = [];
    const conditionsSO: Prisma.Sql[] = [];

    if (period) {
        conditionsDU.push(Prisma.sql`UAR_PERIOD = ${period}`);
        conditionsSO.push(Prisma.sql`UAR_PERIOD = ${period}`);
    }
    if (divisionId) {
        conditionsDU.push(Prisma.sql`DIVISION_ID = ${divisionId}`);
        conditionsSO.push(Prisma.sql`DIVISION_ID = ${divisionId}`);
    }
    if (departmentId) {
        conditionsDU.push(Prisma.sql`DEPARTMENT_ID = ${departmentId}`);
        conditionsSO.push(Prisma.sql`DEPARTMENT_ID = ${departmentId}`);
    }
    if (applicationId) {
        conditionsDU.push(Prisma.sql`APPLICATION_ID = ${applicationId}`);
        conditionsSO.push(Prisma.sql`APPLICATION_ID = ${applicationId}`);
    }

    const whereDU =
        conditionsDU.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(conditionsDU, ' AND ')}`
            : Prisma.empty;

    const whereSO =
        conditionsSO.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(conditionsSO, ' AND ')}`
            : Prisma.empty;

    return { whereDU, whereSO };
}

export interface UarProgressFilters {
    period?: string;
    divisionId?: number;
    departmentId?: number;
    applicationId?: string;
}


interface RawKpiCounts {
    total: number;
    approvedCount: number;
    revokedCount: number;
    completedCount: number;
}


/**
 * [REUSED] Represents a single KPI metric with its count, percentage, and trend.
 */
interface KpiStatItem {
    count: number;
    percentage: number;
    trend: number;
}


export interface KpiStats {
    total: {
        count: number;
        trend: number;
    };
    approved: KpiStatItem;
    revoked: KpiStatItem;
    accessReviewComplete: KpiStatItem;
}

export interface AdminDashboardStats {
    total: {
        count: number;
        trend: number;
    };
    approved: KpiStatItem;
    revoked: KpiStatItem;
    accessReviewComplete: KpiStatItem;
}



export type DphKpiStats = KpiStats;





function getPeriodString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
}


function getYesterdayDateString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const year = yesterday.getFullYear();
    const month = (yesterday.getMonth() + 1).toString().padStart(2, '0');
    const day = yesterday.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function calculateTrend(current: number, previous: number): number {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }
    const trend = ((current - previous) / previous) * 100;
    return parseFloat(trend.toFixed(2));
}


export const dashboardRepository =
{
    async _getRawKpiCountsForYesterday(filters: Omit<UarProgressFilters, 'period'>): Promise<RawKpiCounts> {
        const { divisionId, departmentId, applicationId } = filters;

        const yesterdayDate = getYesterdayDateString();

        const conditionsDU: Prisma.Sql[] = [Prisma.sql`CREATED_DT = ${yesterdayDate}`];
        const conditionsSO: Prisma.Sql[] = [Prisma.sql`CREATED_DT = ${yesterdayDate}`];

        if (divisionId) {
            conditionsDU.push(Prisma.sql`DIVISION_ID = ${divisionId}`);
            conditionsSO.push(Prisma.sql`DIVISION_ID = ${divisionId}`);
        }
        if (departmentId) {
            conditionsDU.push(Prisma.sql`DEPARTMENT_ID = ${departmentId}`);
            conditionsSO.push(Prisma.sql`DEPARTMENT_ID = ${departmentId}`);
        }
        if (applicationId) {
            conditionsDU.push(Prisma.sql`APPLICATION_ID = ${applicationId}`);
            conditionsSO.push(Prisma.sql`APPLICATION_ID = ${applicationId}`);
        }

        const whereDU = Prisma.sql`WHERE ${Prisma.join(conditionsDU, ' AND ')}`;
        const whereSO = Prisma.sql`WHERE ${Prisma.join(conditionsSO, ' AND ')}`;

        const query = Prisma.sql`
            WITH AllUars AS (
                SELECT
                    'DU' AS source, REVIEW_STATUS, DIV_APPROVAL_STATUS, SO_APPROVAL_STATUS
                FROM TB_R_UAR_DIVISION_USER ${whereDU}
                UNION ALL
                SELECT
                    'SO' AS source, REVIEW_STATUS, NULL AS DIV_APPROVAL_STATUS, SO_APPROVAL_STATUS
                FROM TB_R_UAR_SYSTEM_OWNER ${whereSO}
            )
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN SO_APPROVAL_STATUS = '1' THEN 1 ELSE 0 END) AS approvedCount,      -- [NEW] Approved
                SUM(CASE WHEN SO_APPROVAL_STATUS = '2' THEN 1 ELSE 0 END) AS revokedCount,       -- [NEW] Revoked
                SUM(
                    CASE
                        WHEN source = 'DU' AND DIV_APPROVAL_STATUS IS NOT NULL AND DIV_APPROVAL_STATUS != '0' AND SO_APPROVAL_STATUS IS NOT NULL AND SO_APPROVAL_STATUS != '0' THEN 1
                        WHEN source = 'SO' AND SO_APPROVAL_STATUS IS NOT NULL AND SO_APPROVAL_STATUS != '0' THEN 1
                        ELSE 0
                    END
                ) AS completedCount                                                            -- [REUSED] Access Review Complete
            FROM AllUars
        `;

        const result = await prisma.$queryRaw<RawKpiCounts[]>(query);
        const stats = result[0];

        if (!stats || !stats.total) {
            return { total: 0, approvedCount: 0, revokedCount: 0, completedCount: 0 };
        }

        return {
            total: Number(stats.total) || 0,
            approvedCount: Number(stats.approvedCount) || 0,
            revokedCount: Number(stats.revokedCount) || 0,
            completedCount: Number(stats.completedCount) || 0,
        };
    },

    /**
     * [UPDATED] Admin Dashboard Main Stats - Calculates Approved, Revoked, and Completed by UAR_PERIOD.
     */
    async getAdminDashboardStats(filters: UarProgressFilters): Promise<AdminDashboardStats> {
        const currentPeriod = filters.period || getPeriodString(new Date());
        const currentFilters = { ...filters, period: currentPeriod };
        const { period, divisionId, departmentId, applicationId } = currentFilters;
        const { period: _period, ...trendFilters } = filters;

        const conditionsDU: Prisma.Sql[] = [];
        const conditionsSO: Prisma.Sql[] = [];

        if (period) {
            conditionsDU.push(Prisma.sql`UAR_PERIOD = ${period}`);
            conditionsSO.push(Prisma.sql`UAR_PERIOD = ${period}`);
        }
        if (divisionId) {
            conditionsDU.push(Prisma.sql`DIVISION_ID = ${divisionId}`);
            conditionsSO.push(Prisma.sql`DIVISION_ID = ${divisionId}`);
        }
        if (departmentId) {
            conditionsDU.push(Prisma.sql`DEPARTMENT_ID = ${departmentId}`);
            conditionsSO.push(Prisma.sql`DEPARTMENT_ID = ${departmentId}`);
        }
        if (applicationId) {
            conditionsDU.push(Prisma.sql`APPLICATION_ID = ${applicationId}`);
            conditionsSO.push(Prisma.sql`APPLICATION_ID = ${applicationId}`);
        }

        const whereDU = conditionsDU.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditionsDU, ' AND ')}` : Prisma.empty;
        const whereSO = conditionsSO.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditionsSO, ' AND ')}` : Prisma.empty;

        const query = Prisma.sql`
            WITH AllUars AS (
                SELECT
                    'DU' AS source, DIVISION_ID, APPLICATION_ID,
                    REVIEW_STATUS, DIV_APPROVAL_STATUS, SO_APPROVAL_STATUS
                FROM TB_R_UAR_DIVISION_USER ${whereDU}
                UNION ALL
                SELECT
                    'SO' AS source, DIVISION_ID, APPLICATION_ID,
                    REVIEW_STATUS, NULL AS DIV_APPROVAL_STATUS, SO_APPROVAL_STATUS
                FROM TB_R_UAR_SYSTEM_OWNER ${whereSO}
            ),
            Aggregated AS (
                SELECT
                    DIVISION_ID,
                    APPLICATION_ID,
                    
                    COUNT(*) AS total,
                    SUM(CASE WHEN SO_APPROVAL_STATUS = '1' THEN 1 ELSE 0 END) AS approvedCount,       -- [UPDATED] Approved
                    SUM(CASE WHEN SO_APPROVAL_STATUS = '2' THEN 1 ELSE 0 END) AS revokedCount,        -- [UPDATED] Revoked
                    SUM(
                        CASE
                            WHEN source = 'DU' AND DIV_APPROVAL_STATUS IS NOT NULL AND DIV_APPROVAL_STATUS != '0' AND SO_APPROVAL_STATUS IS NOT NULL AND SO_APPROVAL_STATUS != '0' THEN 1
                            WHEN source = 'SO' AND SO_APPROVAL_STATUS IS NOT NULL AND SO_APPROVAL_STATUS != '0' THEN 1
                            ELSE 0
                        END
                    ) AS completedCount                                                             -- [UPDATED] Access Review Complete
                FROM AllUars
                GROUP BY GROUPING SETS (
                    (), 
                    (DIVISION_ID), 
                    (APPLICATION_ID)
                )
            )
            SELECT
                A.*,
                D.DIVISION_NAME,
                APP.APPLICATION_NAME
            FROM Aggregated A
            LEFT JOIN TB_M_DIVISION D ON A.DIVISION_ID = D.DIVISION_ID
            LEFT JOIN TB_M_APPLICATION APP ON A.APPLICATION_ID = APP.APPLICATION_ID
        `;

        const [results, yesterdayStats] = await Promise.all([
            prisma.$queryRaw<any[]>(query),
            this._getRawKpiCountsForYesterday(trendFilters)
        ]);

        let kpiStats: KpiStats = {
            total: { count: 0, trend: 0 },
            approved: { count: 0, percentage: 0, trend: 0 },
            revoked: { count: 0, percentage: 0, trend: 0 },
            accessReviewComplete: { count: 0, percentage: 0, trend: 0 }
        };


        for (const r of results) {
            const total = Number(r.total) || 0;
            const approvedCount = Number(r.approvedCount) || 0;
            const revokedCount = Number(r.revokedCount) || 0;
            const completedCount = Number(r.completedCount) || 0;

            if (r.DIVISION_ID === null && r.APPLICATION_ID === null) {
                kpiStats = {
                    total: {
                        count: total,
                        trend: calculateTrend(total, yesterdayStats.total)
                    },
                    approved: {
                        count: approvedCount,
                        percentage: calculatePercentage(approvedCount, total),
                        trend: calculateTrend(approvedCount, yesterdayStats.approvedCount)
                    },
                    revoked: {
                        count: revokedCount,
                        percentage: calculatePercentage(revokedCount, total),
                        trend: calculateTrend(revokedCount, yesterdayStats.revokedCount)
                    },
                    accessReviewComplete: {
                        count: completedCount,
                        percentage: calculatePercentage(completedCount, total),
                        trend: calculateTrend(completedCount, yesterdayStats.completedCount)
                    }
                };
            }
        }

        return kpiStats;
    },

    async _getRawKpiCountsByPeriod(filters: UarProgressFilters): Promise<RawKpiCounts> {
        const { period, divisionId, departmentId, applicationId } = filters;

        if (!divisionId || !departmentId) {
            throw new Error("DPH Stats query requires at least divisionId and departmentId.");
        }

        const conditions: Prisma.Sql[] = [
            Prisma.sql`DIVISION_ID = ${divisionId}`,
            Prisma.sql`DEPARTMENT_ID = ${departmentId}`
        ];

        if (period) conditions.push(Prisma.sql`UAR_PERIOD = ${period}`);
        if (applicationId) conditions.push(Prisma.sql`APPLICATION_ID = ${applicationId}`);

        const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

        const query = Prisma.sql`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN SO_APPROVAL_STATUS = '1' THEN 1 ELSE 0 END) AS approvedCount,
                SUM(CASE WHEN SO_APPROVAL_STATUS = '2' THEN 1 ELSE 0 END) AS revokedCount,
                SUM(
                    CASE
                        WHEN REVIEW_STATUS IS NOT NULL AND DIV_APPROVAL_STATUS != '0' AND SO_APPROVAL_STATUS != '0'
                        THEN 1
                        ELSE 0
                    END
                ) AS completedCount
            FROM TB_R_UAR_DIVISION_USER
            ${whereClause}
        `;

        const result = await prisma.$queryRaw<RawKpiCounts[]>(query);
        const stats = result[0];

        if (!stats || !stats.total) {
            return { total: 0, approvedCount: 0, revokedCount: 0, completedCount: 0 };
        }

        return {
            total: Number(stats.total) || 0,
            approvedCount: Number(stats.approvedCount) || 0,
            revokedCount: Number(stats.revokedCount) || 0,
            completedCount: Number(stats.completedCount) || 0,
        };
    },

    /**
     * [UPDATED] DPH Trend Helper - Renamed to _getRawKpiCountsForYesterday and uses the new fields.
     */
    async _getRawDphKpiCountsForYesterday(filters: Omit<UarProgressFilters, 'period'>): Promise<RawKpiCounts> {
        const { divisionId, departmentId, applicationId } = filters;

        const yesterdayDate = getYesterdayDateString();

        if (!divisionId || !departmentId) {
            throw new Error("DPH Stats query requires at least divisionId and departmentId.");
        }

        const conditions: Prisma.Sql[] = [
            Prisma.sql`CREATED_DT = ${yesterdayDate}`,
            Prisma.sql`DIVISION_ID = ${divisionId}`,
            Prisma.sql`DEPARTMENT_ID = ${departmentId}`
        ];

        if (applicationId) conditions.push(Prisma.sql`APPLICATION_ID = ${applicationId}`);

        const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

        const query = Prisma.sql`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN SO_APPROVAL_STATUS = '1' THEN 1 ELSE 0 END) AS approvedCount,
                SUM(CASE WHEN SO_APPROVAL_STATUS = '2' THEN 1 ELSE 0 END) AS revokedCount,
                SUM(
                    CASE
                        WHEN REVIEW_STATUS IS NOT NULL AND DIV_APPROVAL_STATUS != '0' AND SO_APPROVAL_STATUS != '0'
                        THEN 1
                        ELSE 0
                    END
                ) AS completedCount
            FROM TB_R_UAR_DIVISION_USER
            ${whereClause}
        `;

        const result = await prisma.$queryRaw<RawKpiCounts[]>(query);
        const stats = result[0];

        if (!stats || !stats.total) {
            return { total: 0, approvedCount: 0, revokedCount: 0, completedCount: 0 };
        }

        return {
            total: Number(stats.total) || 0,
            approvedCount: Number(stats.approvedCount) || 0,
            revokedCount: Number(stats.revokedCount) || 0,
            completedCount: Number(stats.completedCount) || 0,
        };
    },


    async getDphKpiStats(filters: UarProgressFilters): Promise<DphKpiStats> {
        if (!filters.divisionId || !filters.departmentId) {
            throw new Error("DPH Stats query requires at least divisionId and departmentId.");
        }

        const currentPeriod = filters.period || getPeriodString(new Date());
        const currentFilters = { ...filters, period: currentPeriod };
        const { period: _period, ...trendFilters } = filters;

        const [currentStats, yesterdayStats] = await Promise.all([
            this._getRawKpiCountsByPeriod(currentFilters),
            this._getRawDphKpiCountsForYesterday(trendFilters)
        ]);

        const total = currentStats.total;
        const approvedCount = currentStats.approvedCount;
        const revokedCount = currentStats.revokedCount;
        const completedCount = currentStats.completedCount;

        return {
            total: {
                count: total,
                trend: calculateTrend(total, yesterdayStats.total)
            },
            approved: {
                count: approvedCount,
                percentage: calculatePercentage(approvedCount, total),
                trend: calculateTrend(approvedCount, yesterdayStats.approvedCount)
            },
            revoked: {
                count: revokedCount,
                percentage: calculatePercentage(revokedCount, total),
                trend: calculateTrend(revokedCount, yesterdayStats.revokedCount)
            },
            accessReviewComplete: {
                count: completedCount,
                percentage: calculatePercentage(completedCount, total),
                trend: calculateTrend(completedCount, yesterdayStats.completedCount)
            },
        };
    },


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

    async getUarOverallStats(
        params: UarChartParams,
    ): Promise<UarOverallStats> {
        const { whereDU, whereSO } = buildUarWhereClauses(params);

        const query = Prisma.sql`
        WITH AllUars AS (
          SELECT
            'DU' AS source,
            REVIEW_STATUS,
            DIV_APPROVAL_STATUS,
            SO_APPROVAL_STATUS
          FROM TB_R_UAR_DIVISION_USER
          ${whereDU}

          UNION ALL

          SELECT
            'SO' AS source,
            REVIEW_STATUS,
            NULL AS DIV_APPROVAL_STATUS, -- SO table doesn't have Div Approval
            SO_APPROVAL_STATUS
          FROM TB_R_UAR_SYSTEM_OWNER
          ${whereSO}
        )
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN REVIEW_STATUS IS NOT NULL THEN 1 ELSE 0 END) AS reviewedCount,
          SUM(CASE WHEN DIV_APPROVAL_STATUS = '1' THEN 1 ELSE 0 END) AS divApprovedCount,
          SUM(CASE WHEN SO_APPROVAL_STATUS = '1' THEN 1 ELSE 0 END) AS soApprovedCount,

          SUM(
            CASE
              WHEN source = 'DU' AND DIV_APPROVAL_STATUS != '0' AND SO_APPROVAL_STATUS != '0' AND REVIEW_STATUS IS NOT NULL
              THEN 1
              
              WHEN source = 'SO' AND SO_APPROVAL_STATUS != '0' AND REVIEW_STATUS IS NOT NULL
              THEN 1
              
              ELSE 0
            END
          ) AS completedCount
        FROM AllUars;
      `;

        const result = await prisma.$queryRaw<
            Array<{
                total: number;
                reviewedCount: number;
                divApprovedCount: number;
                soApprovedCount: number;
                completedCount: number;
            }>
        >(query);

        const stats = result[0];
        if (!stats) {
            throw new Error('Failed to retrieve UAR stats.');
        }

        const total = Number(stats.total) || 0;
        const reviewedCount = Number(stats.reviewedCount) || 0;
        const divApprovedCount = Number(stats.divApprovedCount) || 0;
        const soApprovedCount = Number(stats.soApprovedCount) || 0;
        const completedCount = Number(stats.completedCount) || 0;

        return {
            total: total,
            reviewed: {
                count: reviewedCount,
                percentage: calculatePercentage(reviewedCount, total),
            },
            divApproved: {
                count: divApprovedCount,
                percentage: calculatePercentage(divApprovedCount, total),
            },
            soApproved: {
                count: soApprovedCount,
                percentage: calculatePercentage(soApprovedCount, total),
            },
            completed: {
                count: completedCount,
                percentage: calculatePercentage(completedCount, total),
            },
        };
    },


    async getUarStatsByDivision(
        params: UarChartParams,
    ): Promise<UarStatsByDivision[]> {
        const { whereDU, whereSO } = buildUarWhereClauses(params);

        const query = Prisma.sql`
        WITH AllUars AS (
          SELECT
            'DU' AS source,
            DIVISION_ID,
            REVIEW_STATUS,
            DIV_APPROVAL_STATUS,
            SO_APPROVAL_STATUS
          FROM TB_R_UAR_DIVISION_USER
          ${whereDU}

          UNION ALL

          SELECT
            'SO' AS source,
            DIVISION_ID,
            REVIEW_STATUS,
            NULL AS DIV_APPROVAL_STATUS,
            SO_APPROVAL_STATUS
          FROM TB_R_UAR_SYSTEM_OWNER
          ${whereSO}
        ),
        AggregatedStats AS (
          SELECT
            DIVISION_ID,
            COUNT(*) AS total,
            SUM(CASE WHEN REVIEW_STATUS IS NOT NULL THEN 1 ELSE 0 END) AS reviewedCount,
            SUM(CASE WHEN DIV_APPROVAL_STATUS = '1' THEN 1 ELSE 0 END) AS divApprovedCount,
            SUM(CASE WHEN SO_APPROVAL_STATUS = '1' THEN 1 ELSE 0 END) AS soApprovedCount,

            SUM(
              CASE
                WHEN source = 'DU' AND DIV_APPROVAL_STATUS != '0' AND SO_APPROVAL_STATUS != '0' AND REVIEW_STATUS IS NOT NULL
                THEN 1
                WHEN source = 'SO' AND SO_APPROVAL_STATUS != '0' AND REVIEW_STATUS IS NOT NULL
                THEN 1
                ELSE 0
              END
            ) AS completedCount

          FROM AllUars
          WHERE DIVISION_ID IS NOT NULL
          GROUP BY DIVISION_ID
        )
        SELECT
          s.DIVISION_ID,
          d.DIVISION_NAME,
          s.total,
          s.reviewedCount,
          s.divApprovedCount,
          s.soApprovedCount,
          s.completedCount
        FROM AggregatedStats s
        LEFT JOIN TB_M_DIVISION d ON s.DIVISION_ID = d.DIVISION_ID
        ORDER BY d.DIVISION_NAME;
      `;

        const results = await prisma.$queryRaw<
            Array<{
                DIVISION_ID: number;
                DIVISION_NAME: string;
                total: number;
                reviewedCount: number;
                divApprovedCount: number;
                soApprovedCount: number;
                completedCount: number;
            }>
        >(query);

        return results.map((r) => ({
            divisionId: r.DIVISION_ID,
            divisionName: r.DIVISION_NAME,
            total: Number(r.total) || 0,
            reviewedCount: Number(r.reviewedCount) || 0,
            divApprovedCount: Number(r.divApprovedCount) || 0,
            soApprovedCount: Number(r.soApprovedCount) || 0,
            completedCount: Number(r.completedCount) || 0,
        }));
    },


    async getUarStatsByApplication(
        params: UarChartParams,
    ): Promise<UarStatsByApplication[]> {
        const { whereDU, whereSO } = buildUarWhereClauses(params);

        const query = Prisma.sql`
        WITH AllUars AS (
          SELECT
            'DU' AS source,
            APPLICATION_ID,
            REVIEW_STATUS,
            DIV_APPROVAL_STATUS,
            SO_APPROVAL_STATUS
          FROM TB_R_UAR_DIVISION_USER
          ${whereDU}

          UNION ALL

          SELECT
            'SO' AS source,
            APPLICATION_ID,
            REVIEW_STATUS,
            NULL AS DIV_APPROVAL_STATUS,
            SO_APPROVAL_STATUS
          FROM TB_R_UAR_SYSTEM_OWNER
          ${whereSO}
        ),
        AggregatedStats AS (
          SELECT
            APPLICATION_ID,
            COUNT(*) AS total,
            SUM(CASE WHEN REVIEW_STATUS IS NOT NULL THEN 1 ELSE 0 END) AS reviewedCount,
            SUM(CASE WHEN DIV_APPROVAL_STATUS = '1' THEN 1 ELSE 0 END) AS divApprovedCount,
            SUM(CASE WHEN SO_APPROVAL_STATUS = '1' THEN 1 ELSE 0 END) AS soApprovedCount,
            
            SUM(
              CASE
                WHEN source = 'DU' AND DIV_APPROVAL_STATUS != '0' AND SO_APPROVAL_STATUS != '0' AND REVIEW_STATUS IS NOT NULL
                THEN 1
                WHEN source = 'SO' AND SO_APPROVAL_STATUS != '0' AND REVIEW_STATUS IS NOT NULL
                THEN 1
                ELSE 0
              END
            ) AS completedCount
            
          FROM AllUars
          WHERE APPLICATION_ID IS NOT NULL
          GROUP BY APPLICATION_ID
        )
        SELECT
          s.APPLICATION_ID,
          a.APPLICATION_NAME,
          s.total,
          s.reviewedCount,
          s.divApprovedCount,
          s.soApprovedCount,
          s.completedCount
        FROM AggregatedStats s
        LEFT JOIN TB_M_APPLICATION a ON s.APPLICATION_ID = a.APPLICATION_ID
        ORDER BY a.APPLICATION_NAME;
      `;

        const results = await prisma.$queryRaw<
            Array<{
                APPLICATION_ID: string;
                APPLICATION_NAME: string;
                total: number;
                reviewedCount: number;
                divApprovedCount: number;
                soApprovedCount: number;
                completedCount: number;
            }>
        >(query);

        return results.map((r) => ({
            applicationId: r.APPLICATION_ID,
            applicationName: r.APPLICATION_NAME,
            total: Number(r.total) || 0,
            reviewedCount: Number(r.reviewedCount) || 0,
            divApprovedCount: Number(r.divApprovedCount) || 0,
            soApprovedCount: Number(r.soApprovedCount) || 0,
            completedCount: Number(r.completedCount) || 0,
        }));
    },


    async getPeriodOptions() {
        const result = await prisma.$queryRaw<Array<{ UAR_PERIOD: string }>>`
            SELECT DISTINCT UAR_PERIOD FROM TB_R_UAR_DIVISION_USER
            WHERE UAR_PERIOD IS NOT NULL
            UNION
            SELECT DISTINCT UAR_PERIOD FROM TB_R_UAR_SYSTEM_OWNER
            WHERE UAR_PERIOD IS NOT NULL
            ORDER BY UAR_PERIOD DESC
        `;
        return result.map(r => r.UAR_PERIOD);
    },


    async getDivisionOptions() {
        return prisma.tB_M_DIVISION.findMany({
            select: {
                DIVISION_ID: true,
                DIVISION_NAME: true,
            },
            orderBy: {
                DIVISION_NAME: 'asc'
            }
        });
    },


    async getDepartmentOptions(divisionId: number) {
        return prisma.tB_M_EMPLOYEE.findMany({
            where: {
                DIVISION_ID: divisionId,
                DEPARTMENT_ID: { not: null },
                DEPARTMENT_NAME: { not: null },
            },
            select: {
                DEPARTMENT_ID: true,
                DEPARTMENT_NAME: true,
            },
            distinct: ['DEPARTMENT_ID', 'DEPARTMENT_NAME'],
            orderBy: {
                DEPARTMENT_NAME: 'asc'
            }
        });
    },


    async getApplicationOptions() {
        return prisma.tB_M_APPLICATION.findMany({
            select: {
                APPLICATION_ID: true,
                APPLICATION_NAME: true,
            },
            orderBy: {
                APPLICATION_NAME: 'asc'
            }
        });
    },
};