import { http } from "../api/client";
import { withToken } from "../api/helper";

import type {
  BackendProgressResponse,
  DivisionOption,
  DepartmentOption,
  ApplicationOption,
  PeriodOption,
  KpiDashboardStats
} from '../types/progress';
import type { UarProgressFilters } from "../store/uarProgressStore";


export const getProgressApi = (filters: UarProgressFilters, signal?: AbortSignal) =>
  withToken((token) =>
    http<BackendProgressResponse>({
      path: "/sar/dashboard/progress",
      method: "GET",
      token,
      params: filters,
      signal: signal
    })
  );

export const getAdminDashboard = (signal?: AbortSignal) =>
  withToken((token) =>
    http<KpiDashboardStats>({
      path: "/sar/dashboard/admin",
      method: "GET",
      token,
      signal: signal
    })
  );

export const getSoDashboard = (signal?: AbortSignal) =>
  withToken((token) =>
    http<KpiDashboardStats>({
      path: "/sar/dashboard/so",
      method: "GET",
      token,
      signal: signal
    })
  );
export const getDphDashboard = (signal?: AbortSignal) =>
  withToken((token) =>
    http<KpiDashboardStats>({
      path: "/sar/dashboard/dph",
      method: "GET",
      token,
      signal: signal
    })
  );


export const getDepartmentOptionsApi = (divisionId: number) =>
  withToken((token) =>
    http<DepartmentOption[]>({
      path: "/sar/dashboard/filter-options/departments",
      method: "GET",
      token,
      params: { divisionId }
    })
  );


export const getPeriodOptionsApi = () =>
  withToken((token) =>
    http<PeriodOption[]>({
      path: "/sar/dashboard/filter-options/periods",
      method: "GET",
      token
    })
  );


export const getDivisionOptionsApi = () =>
  withToken((token) =>
    http<DivisionOption[]>({
      path: "/sar/dashboard/filter-options/divisions",
      method: "GET",
      token
    })
  );


export const getApplicationOptionsApi = () =>
  withToken((token) =>
    http<ApplicationOption[]>({
      path: "/sar/dashboard/filter-options/applications",
      method: "GET",
      token
    })
  );