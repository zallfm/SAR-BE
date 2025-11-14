import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { UarSystemOwnerRecord, LogEntry } from '../../data' // Keep existing types
import { initialUarSystemOwnerData } from '../../data'
import type {
  UarHeader,
  UarDetailItem,
  ApiMeta,
  BatchUpdatePayload
} from '../types/uarDivision'
import {
  getUarListApi,
  UarListFilters,
  getUarDetailApi,
  batchUpdateApi
} from '../api/uarDivision'
import type {
  SystemOwnerUarHeader,
  SystemOwnerUarDetailItem,
  SystemOwnerBatchUpdatePayload,
} from '../types/uarSystemOwner' // <-- Tipe baru
import {
  getUarListApi as getSystemOwnerUarListApi, // <-- API baru
  SystemOwnerUarListFilters, // <-- Tipe filter baru
  getUarDetailApi as getSystemOwnerUarDetailApi, // <-- API baru
  batchUpdateApi as batchUpdateSystemOwnerApi, // <-- API baru
} from '../api/uarSystemOwner'
export interface UarState {
  // --- System Owner State (Existing) ---
  systemOwnerRecords: UarSystemOwnerRecord[]

  // --- Division User State (Replaced) ---
  divisionUserHeaders: UarHeader[] // <-- Replaces divisionUserRecords
  selectedDivisionUser: UarHeader | null
  divisionUserMeta: ApiMeta | null
  divisionUserFilters: Pick<UarListFilters, "period" | "uarId">
  divisionUserCurrentPage: number
  divisionUserItemsPerPage: number
  divisionUserDetails: UarDetailItem[] // <-- Replaces selectedDivisionUser (for detail page)

  systemOwnerHeaders: SystemOwnerUarHeader[];
  selectedSystemOwner: SystemOwnerUarHeader | null;
  systemOwnerMeta: ApiMeta | null;
  systemOwnerFilters: Pick<SystemOwnerUarListFilters, "period" | "uarId" | "applicationId">;
  systemOwnerCurrentPage: number;
  systemOwnerItemsPerPage: number;
  systemOwnerDetails: SystemOwnerUarDetailItem[];

  // --- Common State ---
  selectedLog: LogEntry | null
  isLoading: boolean
  error: string | null

  // --- Actions (Modified) ---
  setSystemOwnerRecords: (records: UarSystemOwnerRecord[]) => void
  setSelectedLog: (log: LogEntry | null) => void
  resetSelections: () => void

  // --- New Actions for Division User ---
  setDivisionUserFilters: (filters: Partial<UarListFilters>) => void
  selectDivisionUser: (uarDivision: UarHeader | null) => void
  setDivisionUserCurrentPage: (page: number) => void
  setDivisionUserItemsPerPage: (size: number) => void
  getUarList: (params?: UarListFilters & { signal?: AbortSignal }) => Promise<void>
  getUarDetails: (uarId: string, signal?: AbortSignal) => Promise<void>
  clearUarDetails: () => void
  batchUpdate: (payload: BatchUpdatePayload) => Promise<{ error?: { message: string } }>
  getTotalDivisionUserPages: () => number


  selectSystemOwner: (record: SystemOwnerUarHeader | null) => void;
  setSystemOwnerFilters: (filters: Partial<SystemOwnerUarListFilters>) => void;
  setSystemOwnerCurrentPage: (page: number) => void;
  setSystemOwnerItemsPerPage: (size: number) => void;
  getSystemOwnerList: (params?: SystemOwnerUarListFilters & { signal?: AbortSignal }) => Promise<void>;
  getSystemOwnerDetails: (uarId: string, applicationId: string | undefined, signal?: AbortSignal) => Promise<void>;
  clearSystemOwnerDetails: () => void;
  batchUpdateSystemOwner: (payload: SystemOwnerBatchUpdatePayload) => Promise<{ error?: { message: string } }>;
  getTotalSystemOwnerPages: () => number;
}

const initialDivisionUserFilters: UarState["divisionUserFilters"] = {
  period: "",
  uarId: "",
};

export const useUarStore = create<UarState>()(
  devtools(
    persist(
      (set, get) => ({
        // --- Existing State ---
        systemOwnerRecords: initialUarSystemOwnerData,
        selectedSystemOwner: null,
        selectedLog: null,
        systemOwnerHeaders: [],
        systemOwnerMeta: null,
        systemOwnerFilters: { period: "", uarId: "", applicationId: "" },
        systemOwnerCurrentPage: 1,
        systemOwnerItemsPerPage: 10,
        systemOwnerDetails: [],

        // --- New Division User State ---
        divisionUserHeaders: [], // <-- Replaces divisionUserRecords
        selectedDivisionUser: null,
        divisionUserMeta: null,
        divisionUserFilters: initialDivisionUserFilters,
        divisionUserCurrentPage: 1,
        divisionUserItemsPerPage: 10,
        divisionUserDetails: [], // <-- Replaces selectedDivisionUser
        isLoading: false,
        error: null,

        // --- Existing Actions ---
        setSystemOwnerRecords: (records) =>
          set({ systemOwnerRecords: records, selectedSystemOwner: null }),
        selectSystemOwner: (record) => set({ selectedSystemOwner: record }),
        setSelectedLog: (log) => set({ selectedLog: log }),
        resetSelections: () => set({ selectedSystemOwner: null, divisionUserDetails: [], selectedLog: null }),
        selectDivisionUser: (uarDivision) => {
          set({
            selectedDivisionUser: uarDivision
          })
        },

        // --- New Actions for Division User ---
        getUarList: async (params) => {
          const { signal, ...restParams } = params || {};
          const state = get();
          const query: UarListFilters = {
            ...state.divisionUserFilters,
            ...restParams,
            page: params?.page ?? state.divisionUserCurrentPage,
            limit: params?.limit ?? state.divisionUserItemsPerPage,
          };

          set({ isLoading: true, error: null });
          try {
            const res = await getUarListApi(query, signal);
            console.log(res)
            set({
              divisionUserHeaders: res.data,
              divisionUserMeta: res.meta,
              isLoading: false,
              divisionUserCurrentPage: res.meta.page,
              divisionUserItemsPerPage: res.meta.limit,
            });
          } catch (error: any) {
            if (error.name === "AbortError") return;
            console.log(error)
            set({ error: (error as Error).message, isLoading: false });
          }
        },

        getUarDetails: async (uarId, signal) => {
          set({ isLoading: true, error: null });
          try {
            const res = await getUarDetailApi(uarId, signal);
            set({
              divisionUserDetails: res.data,
              isLoading: false,
            });
          } catch (error: any) {
            if (error.name === "AbortError") return;
            set({ error: (error as Error).message, isLoading: false });
          }
        },

        clearUarDetails: () => set({ divisionUserDetails: [] }),

        batchUpdate: async (payload) => {
          set({ isLoading: true });
          try {
            await batchUpdateApi(payload);
            await get().getUarDetails(payload.uarId);
            return { error: undefined };
          } catch (error: any) {
            set({ error: (error as Error).message, isLoading: false });
            return { error: { message: (error as Error).message } };
          }
        },

        setDivisionUserFilters: (newFilters) => {
          set((state) => ({
            divisionUserFilters: { ...state.divisionUserFilters, ...newFilters },
            divisionUserCurrentPage: 1, // Reset to page 1
          }));
        },
        setDivisionUserCurrentPage: (page) => set({ divisionUserCurrentPage: page }),
        setDivisionUserItemsPerPage: (size) => set({ divisionUserItemsPerPage: size, divisionUserCurrentPage: 1 }),

        getTotalDivisionUserPages: () => {
          return get().divisionUserMeta?.totalPages ?? 1;
        },


        getSystemOwnerList: async (params) => {
          const { signal, ...restParams } = params || {};
          const state = get();
          const query: SystemOwnerUarListFilters = {
            ...state.systemOwnerFilters,
            ...restParams,
            page: params?.page ?? state.systemOwnerCurrentPage,
            limit: params?.limit ?? state.systemOwnerItemsPerPage,
          };

          set({ isLoading: true, error: null });
          try {
            // Gunakan API baru
            const res = await getSystemOwnerUarListApi(query, signal);
            set({
              systemOwnerHeaders: res.data,
              systemOwnerMeta: res.meta,
              isLoading: false,
              systemOwnerCurrentPage: res.meta.page,
              systemOwnerItemsPerPage: res.meta.limit,
            });
          } catch (error: any) {
            if (error.name === "AbortError") return;
            set({ error: (error as Error).message, isLoading: false });
          }
        },

        getSystemOwnerDetails: async (uarId, applicationId, signal) => {
          set({ isLoading: true, error: null });
          try {
            // Gunakan API baru
            const res = await getSystemOwnerUarDetailApi(uarId, applicationId, signal);

            // Gabungkan kedua list dari BE menjadi satu list untuk FE
            const combinedDetails = [
              ...res.data.systemOwnerUsers,
              ...res.data.divisionUsers,
            ];

            set({
              systemOwnerDetails: combinedDetails, // <-- Set data detail
              isLoading: false,
            });
          } catch (error: any) {
            if (error.name === "AbortError") return;
            set({ error: (error as Error).message, isLoading: false });
          }
        },

        clearSystemOwnerDetails: () => set({ systemOwnerDetails: [] }),

        batchUpdateSystemOwner: async (payload) => {
          set({ isLoading: true });
          try {
            await batchUpdateSystemOwnerApi(payload);
            await get().getSystemOwnerDetails(payload.uarId, payload.applicationId);
            return { error: undefined };
          } catch (error: any) {
            set({ error: (error as Error).message, isLoading: false });
            return { error: { message: (error as Error).message } };
          }
        },

        setSystemOwnerFilters: (newFilters) => {
          set((state) => ({
            systemOwnerFilters: { ...state.systemOwnerFilters, ...newFilters },
            systemOwnerCurrentPage: 1,
          }));
        },
        setSystemOwnerCurrentPage: (page) => set({ systemOwnerCurrentPage: page }),
        setSystemOwnerItemsPerPage: (size) => set({ systemOwnerItemsPerPage: size, systemOwnerCurrentPage: 1 }),

        getTotalSystemOwnerPages: () => {
          return get().systemOwnerMeta?.totalPages ?? 1;
        },

      }),
      {
        name: "uar-pic-store",
        partialize: (state) => ({
          divisionUserHeaders: state.divisionUserHeaders,
          divisionUserMeta: state.divisionUserMeta,
          divisionUserFilters: state.divisionUserFilters,
          currentPage: state.divisionUserCurrentPage,
          itemsPerPage: state.divisionUserItemsPerPage,
        }),
      }
    ),
    {
      name: 'UarStore',
    }
  )
)

