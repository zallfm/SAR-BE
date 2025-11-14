import { create } from "zustand";
import { persist } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { divisions, type PicUser } from "../../data";
import {
  createUarApi,
  deleteUarApi,
  editUarApi,
  getUarApi,
} from "../api/pic.api";
import {
  BackendCreateUarResponse,
  CreateUarPayload,
  EditUarPayload,
  UarPic,
} from "../types/pic";
import { getDivisionOptionsApi } from "../services/uarProgressService";

type ApiMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export interface Division {
  id: number, name: string
}

// --- Original Types ---

export interface UarPicFilters {
  page?: number;
  limit?: number;
  q?: string;
  order?: "asc" | "desc";
  pic_name: string;
  divisionId: string;
}

interface PicResponse {
  data: UarPic[] | undefined;
  error: { message: string; code?: number } | undefined;
}

export interface UarPicState {
  // Data
  pics: PicUser[];
  filteredPics: PicUser[]; // Kept for compatibility, will mirror 'pics'
  selectedPic: PicUser | null;
  divisions: Division[];
  // ADDED: Meta from server
  meta: ApiMeta | null;

  // Filters
  filters: UarPicFilters;

  // Pagination
  currentPage: number;
  itemsPerPage: number;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  setPics: (pics: PicUser[]) => void;
  setFilteredPics: (pics: PicUser[]) => void;
  setSelectedPic: (pic: PicUser | null) => void;
  setFilters: (filters: Partial<UarPicFilters>) => void;
  resetFilters: () => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // CRUD Operations
  getDivision: () => Promise<void>;
  addPic: (pic: Omit<PicUser, "id">) => Promise<PicResponse>;
  updatePic: (id: string, updates: Partial<PicUser>) => Promise<PicResponse>;
  // MODIFIED: deletePic is now async to allow for refetch
  deletePic: (id: string) => Promise<void>;
  // MODIFIED: getPics now accepts params
  getPics: (params?: UarPicFilters & { signal?: AbortSignal }) => Promise<void>;

  // Computed
  getTotalPages: () => number;
  getCurrentPagePics: () => PicUser[];
}

const initialFilters: UarPicFilters = {
  pic_name: "",
  divisionId: "",
};

export const useUarPicStore = create<UarPicState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        pics: [],
        filteredPics: [],
        selectedPic: null,
        divisions: [],

        meta: null, // ADDED

        filters: initialFilters,
        currentPage: 1,
        itemsPerPage: 10,
        isLoading: false,
        error: null,

        // In useUarPicStore.ts

        getDivision: async () => {
          const divisionData = await getDivisionOptionsApi()
          set({ divisions: divisionData });
        },
        getPics: async (params) => {
          // 1. Destructure the signal from params
          const {
            page: paramPage,
            limit: paramLimit,
            signal,
            ...restParams
          } = params || {};
          const state = get();
          const page = paramPage ?? state.currentPage;
          const limit = paramLimit ?? state.itemsPerPage;

          const query: UarPicFilters = {
            ...state.filters,
            ...restParams,
            page,
            limit,
          };

          state.getDivision()
          set({ isLoading: true, error: null });
          try {
            // 2. Pass the signal to your API call
            const res = await getUarApi(query, signal); // <-- PASS SIGNAL HERE


            // ... (rest of your success logic is fine) ...
            const { data: raw, meta: metaFromApi } = res as {
              data: UarPic[];
              meta?: ApiMeta;
            };

            const pics: PicUser[] = (raw ?? []).map((item: UarPic) => ({
              ID: item.ID,
              PIC_NAME: item.PIC_NAME,
              DIVISION_ID: item.DIVISION_ID,
              MAIL: item.MAIL,
            }));

            set({
              pics,
              filteredPics: pics,
              meta: metaFromApi,
              isLoading: false,
              currentPage: metaFromApi?.page ?? page,
              itemsPerPage: metaFromApi?.limit ?? limit,
            });

          } catch (error: any) {
            if (error.name === 'AbortError' || error.name === 'CanceledError') {
              console.log("Fetch aborted");
              return;
            }
            // Handle *real* errors
            set({ error: (error as Error).message, isLoading: false });
          }
        },
        // Actions
        setPics: (pics) => set({ pics, filteredPics: pics }),
        setFilteredPics: (filteredPics) => set({ filteredPics }),
        setSelectedPic: (selectedPic) => set({ selectedPic }),

        setFilters: (newFilters: Partial<UarPicFilters>) => {
          const mergedFilters: UarPicFilters = {
            ...initialFilters,
            ...get().filters,
            ...newFilters,
          };

          set((state) => ({
            filters: mergedFilters,
            currentPage: 1,
          }));
        },

        resetFilters: async () => {
          set({ filters: initialFilters, currentPage: 1 });
        },

        setCurrentPage: async (currentPage) => {
          set({ currentPage });
        },

        setItemsPerPage: (itemsPerPage) =>
          set({ itemsPerPage, currentPage: 1 }),

        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),

        addPic: async (newPic) => {
          try {
            const payload: CreateUarPayload = {
              PIC_NAME: newPic.PIC_NAME,
              DIVISION_ID: newPic.DIVISION_ID,
              MAIL: newPic.MAIL,
            };

            const data: BackendCreateUarResponse = await createUarApi(payload);
            const pic: PicUser = {
              ID: data.data.ID,
              PIC_NAME: data.data.PIC_NAME,
              DIVISION_ID: data.data.DIVISION_ID,
              MAIL: data.data.MAIL,
            };

            await get().getPics();

            return { data: [pic], error: undefined };
          } catch (error) {
            console.error("Error creating PIC:", error);
            return {
              data: undefined,
              error: {
                message: (error as Error).message,
                code: (error as any).code,
              },
            };
          }
        },

        updatePic: async (id, updates) => {
          try {
            const payload: EditUarPayload = {
              PIC_NAME: updates.PIC_NAME,
              DIVISION_ID: updates.DIVISION_ID,
              MAIL: updates.MAIL,
            };

            const data: BackendCreateUarResponse = await editUarApi(
              id,
              payload
            );

            await get().getPics();

            return { data: [data.data], error: undefined };
          } catch (error) {
            console.error("Error updating PIC:", error);
            return {
              data: undefined,
              error: {
                message: (error as Error).message,
                code: (error as any).code,
              },
            };
          }
        },

        deletePic: async (id) => {
          try {
            await deleteUarApi(id);
            await get().getPics();
          } catch (error) {
            console.error("Error deleting PIC:", error);
            set({ error: (error as Error).message, isLoading: false });
          }
        },

        // MODIFIED: Computed properties now read from server meta
        getTotalPages: () => {
          const { meta } = get();
          return meta?.totalPages ?? 1;
        },

        getCurrentPagePics: () => {
          const { pics } = get();
          return pics;
        },
      }),
      {
        name: "uar-pic-store",
        partialize: (state) => ({
          pics: state.pics,
          meta: state.meta,
          filteredPics: state.filteredPics,
          filters: state.filters,
          currentPage: state.currentPage,
          itemsPerPage: state.itemsPerPage,
        }),
      }
    ),
    {
      name: "UarPicStore",
    }
  )
);
