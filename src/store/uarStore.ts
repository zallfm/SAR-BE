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
} from '../api/uarDivision' // <-- Import new API

export interface UarState {
  // --- System Owner State (Existing) ---
  systemOwnerRecords: UarSystemOwnerRecord[]
  selectedSystemOwner: UarSystemOwnerRecord | null

  // --- Division User State (Replaced) ---
  divisionUserHeaders: UarHeader[] // <-- Replaces divisionUserRecords
  selectedDivisionUser: UarHeader | null
  divisionUserMeta: ApiMeta | null
  divisionUserFilters: Pick<UarListFilters, "period" | "uarId">
  divisionUserCurrentPage: number
  divisionUserItemsPerPage: number
  divisionUserDetails: UarDetailItem[] // <-- Replaces selectedDivisionUser (for detail page)

  // --- Common State ---
  selectedLog: LogEntry | null
  isLoading: boolean
  error: string | null

  // --- Actions (Modified) ---
  setSystemOwnerRecords: (records: UarSystemOwnerRecord[]) => void
  selectSystemOwner: (record: UarSystemOwnerRecord | null) => void
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

