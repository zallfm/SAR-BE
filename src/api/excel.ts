import { http } from "./client";
import { withToken } from "./helper";

export type ExportUarParams = {
  uar_id: string;
  type?: "div_user" | "so_user";
};
export const exportExcel = (params: ExportUarParams) =>
  withToken((token) =>
    http<{ blob: Blob; filename?: string }>({
      path: "/sar/excel_uar/export",
      method: "GET",
      token,
      params: {
        uar_id: params.uar_id,
        type: params.type ?? "div_user",
      },
      responseType: "blob",
    })
  );
