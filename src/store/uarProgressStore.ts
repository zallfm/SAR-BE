import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type {
  BackendProgressResponse,
  KpiStats,
  DivisionChartItem,
  ApplicationChartItem,
} from '../types/progress'

import {
  getProgressApi,
  getPeriodOptionsApi,
  getDivisionOptionsApi,
  getDepartmentOptionsApi,
  getApplicationOptionsApi
} from '../services/uarProgressService'

// 3. DEFINE THE FILTERS YOUR API ACCEPTS
export interface UarProgressFilters {
  period?: string;
  divisionId?: number;
  departmentId?: number;
  applicationId?: string;
}

// 4. DEFINE THE STATE FOR FILTER DROPDOWNS
export interface FilterOptions {
  periods: string[];
  divisions: { id: number, name: string }[];
  departments: { id: number, name: string }[];
  applications: { id: string, name: string }[];
}

interface UarProgressState {
  kpiStats: KpiStats | null;
  divisionChartData: DivisionChartItem[];
  applicationChartData: ApplicationChartItem[];

  filters: UarProgressFilters;
  filterOptions: FilterOptions;

  drilldownDivision: string | null;

  isLoading: boolean;
  isFiltersLoading: boolean;
  error: string | null;

  fetchDashboardData: (params?: UarProgressFilters) => Promise<void>;

  fetchFilterOptions: () => Promise<void>;
  fetchDepartmentOptions: (divisionId: number) => Promise<void>;

  setFilters: (filters: Partial<UarProgressFilters>) => void;

  setDrilldownDivision: (division: string | null) => void;
  setError: (error: string | null) => void;

  getKpiStats: () => KpiStats | null;
  getDivisionChartData: () => DivisionChartItem[];
  getApplicationChartData: () => ApplicationChartItem[];
   getDepartmentChartData: () => any[] | null; 
}

const initialFilters: UarProgressFilters = {
};

export const useUarProgressStore = create<UarProgressState>()(
  devtools(
    (set, get) => ({
      // --- Initial State ---
      kpiStats: null,
      divisionChartData: [],
      applicationChartData: [],

      filters: initialFilters,
      filterOptions: {
        periods: [],
        divisions: [],
        departments: [],
        applications: [],
      },

      drilldownDivision: null,
      isLoading: false,
      isFiltersLoading: false,
      error: null,

      // --- Actions ---

      /**
       * Fetches the main dashboard data from the API
       */
      fetchDashboardData: async (params) => {
        const state = get();
        // Merge request params with current state filters
        const query = { ...state.filters, ...params };

        set({ isLoading: true, error: null });
        try {
          const res = await getProgressApi(query);

          set({
            kpiStats: res.kpiStats,
            divisionChartData: res.divisionChart,
            applicationChartData: res.applicationChart,
            isLoading: false,
          });

        } catch (error: any) {
          if (error.name !== 'AbortError') {
            set({ error: (error as Error).message, isLoading: false });
          }
        }
      },

      fetchFilterOptions: async () => {
        set({ isFiltersLoading: true });
        try {
          // Fetch all independent dropdowns in parallel
          const [periods, divisions, applications] = await Promise.all([
            getPeriodOptionsApi(),
            getDivisionOptionsApi(),
            getApplicationOptionsApi(),
          ]);

          set(state => ({
            filterOptions: {
              ...state.filterOptions,
              periods: periods,         // e.g., ["202507", "202506"]
              divisions: divisions,     // e.g., [{ id: 1, name: "ISTD" }]
              applications: applications, // e.g., [{ id: "SAR", name: "SAR" }]
            },
            isFiltersLoading: false,
          }));

        } catch (error: any) {
          set({ error: (error as Error).message, isFiltersLoading: false });
        }
      },

      /**
       * Fetches dependent department options when a division is selected
       */
      fetchDepartmentOptions: async (divisionId: number) => {
        set({ isFiltersLoading: true });
        try {
          const departments = await getDepartmentOptionsApi(divisionId);
          set(state => ({
            filterOptions: {
              ...state.filterOptions,
              departments: departments, // e.g., [{ id: 101, name: "IT Infra" }]
            },
            isFiltersLoading: false,
          }));
        } catch (error: any) {
          set({ error: (error as Error).message, isFiltersLoading: false });
        }
      },

      /**
       * Sets a filter and automatically refetches the dashboard data
       */
      setFilters: (newFilters: Partial<UarProgressFilters>) => {
        const mergedFilters = { ...get().filters, ...newFilters };
        set({ filters: mergedFilters });

        // This is the key: auto-fetch when filters change
        get().fetchDashboardData(mergedFilters);

        // Handle cascading dropdown logic
        if (newFilters.divisionId) {
          // If division changed, fetch new departments
          get().fetchDepartmentOptions(newFilters.divisionId);
        } else if (newFilters.divisionId === null) {
          // If division was cleared, clear departments
          set(state => ({
            filterOptions: { ...state.filterOptions, departments: [] }
          }));
        }
      },

      setDrilldownDivision: (division) => set({ drilldownDivision: division }),
      setError: (error) => set({ error }),

      getKpiStats: () => get().kpiStats,
      getDivisionChartData: () => get().divisionChartData,
      getApplicationChartData: () => get().applicationChartData,

      getDepartmentChartData: () => {

        console.warn("getDepartmentChartData needs a dedicated API endpoint");
        return null;
      },
    }),
    {
      name: 'uar-progress-store-v2', // Renamed to avoid cache conflicts
    }
  )
)