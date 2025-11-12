import { dashboardRepository as repo, UarChartParams } from "./dashboard.repository";


export const dashboardService = {

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
        return repo.getDivisionOptions();
    },


    async getDepartmentOptions(divisionId: number) {
        if (!divisionId) {
            return [];
        }
        return repo.getDepartmentOptions(divisionId);
    },


    async getApplicationOptions() {
        return repo.getApplicationOptions();
    }

};