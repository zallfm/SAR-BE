import {
    dashboardRepository as repo, UarChartParams, UarProgressFilters,
    AdminDashboardStats,
    DphKpiStats
} from "./dashboard.repository";


interface UserAuth {
    divisionId: number;
    departmentId: number;
    role: string;
}

export const dashboardService = {

    async getAdminDashboardStats(
        filters: UarProgressFilters
    ): Promise<AdminDashboardStats> {
        return repo.getAdminDashboardStats(filters);
    },


    async getSoDashboardStats(
        auth: UserAuth,
        filters: Omit<UarProgressFilters, 'divisionId' | 'departmentId'>
    ): Promise<AdminDashboardStats> {

        const params: UarProgressFilters = {
            ...filters,
            divisionId: auth.divisionId,
        };

        return repo.getAdminDashboardStats(params);
    },


    async getDphDashboardStats(
        auth: UserAuth,
        filters: Omit<UarProgressFilters, 'divisionId' | 'departmentId'>
    ): Promise<DphKpiStats> {

        const params = {
            ...filters,
            divisionId: auth.divisionId,
            departmentId: auth.departmentId
        };

        return repo.getDphKpiStats(params);
    },

    async getUarDashboardStats(
        filters: {
            period?: string;
            divisionId?: number;
            departmentId?: number;
            applicationId?: string;
        }
    ) {



        const [kpiStats, divisionChart, applicationChart] = await Promise.all([
            repo.getUarOverallStats(filters),
            repo.getUarStatsByDivision(filters),
            repo.getUarStatsByApplication(filters),
        ]);

        return {
            kpiStats,
            divisionChart,
            applicationChart,
        };
    },

    async getPeriodOptions() {
        return repo.getPeriodOptions();
    },


    async getDivisionOptions() {
        const divisions = await repo.getDivisionOptions();
        return divisions.map(division => ({
            id: division.DIVISION_ID,
            name: division.DIVISION_NAME,
        }));
    },

    async getDepartmentOptions(divisionId: number) {
        if (!divisionId) {
            return [];
        }
        const departments = await repo.getDepartmentOptions(divisionId);
        return departments.map(department => ({
            id: department.DEPARTMENT_ID,
            name: department.DEPARTMENT_NAME,
        }));
    },

    async getApplicationOptions() {
        const applications = await repo.getApplicationOptions();
        return applications.map(application => ({
            id: application.APPLICATION_ID,
            name: application.APPLICATION_NAME,
        }));
    }
};