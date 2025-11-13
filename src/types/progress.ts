export type KpiDashboardStatItem = {
    count: number;
    percentage: number;
    trend: number; 
};

export type KpiTotalStat = {
    count: number;
    trend: number; 
};

export type KpiDashboardStats = {
    total: KpiTotalStat;
    approved: KpiDashboardStatItem;
    revoked: KpiDashboardStatItem;
    accessReviewComplete: KpiDashboardStatItem;
};



export type KpiStatItem = {
    count: number;
    percentage: number;
};

export type KpiStats = {
    total: number;
    reviewed: KpiStatItem;
    divApproved: KpiStatItem;
    soApproved: KpiStatItem;
    completed: KpiStatItem;
};

export type DivisionChartItem = {
    divisionId: number;
    divisionName: string;
    total: number;
    reviewedCount: number;
    divApprovedCount: number;
    soApprovedCount: number;
    completedCount: number;
};


export type ApplicationChartItem = {
    applicationId: string;
    applicationName: string;
    total: number;
    reviewedCount: number;
    divApprovedCount: number;
    soApprovedCount: number;
    completedCount: number;
};


export type BackendProgressResponse = {
    kpiStats: KpiStats;
    divisionChart: DivisionChartItem[];
    applicationChart: ApplicationChartItem[];
};

export type PeriodOption = string;


export type DivisionOption = {
    id: number;
    name: string;
};


export type DepartmentOption = {
    id: number;
    name: string;
};


export type ApplicationOption = {
    id: string;
    name: string;
};