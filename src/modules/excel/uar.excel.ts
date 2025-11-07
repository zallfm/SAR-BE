import ExcelJS from "exceljs";
import type { FillPattern, Alignment, Borders } from "exceljs";
import { uarDivisionService as svc } from "../uar_division/uar_division.service";
import { uarSystemOwnerService as svcso } from "../uar_system_owner/uar_system_owner.service";

type BuildOpts = {
  type?: "div_user" | "so_user";
  applicationId?: string;
  userNoreg?: string;
};

export async function buildUarExcelTemplate(
  uarId: string,
  userDivisionId: number,
  opts?: BuildOpts
) {
  const type = opts?.type ?? "div_user";

  const fallback = "field tidak ada";
  const v = <T>(x: T | null | undefined, fb = fallback) =>
    (x === null || x === undefined || x === "") ? fb : (x as any);

  const yes = (s: any) => {
    const str = String(s ?? "").toUpperCase();
    return str === "Y" || str === "YES" || str === "1" || str === "APPROVED" || str === "DONE" || str === "COMPLETED";
  };

  let header: any | null = null;
  let details: any[] = [];

  if (type === "div_user") {
    const resp: any = await svc.getUar(uarId, userDivisionId);
    // Antisipasi 2 bentuk (langsung vs dibungkus {data})
    const h = resp?.header ?? resp?.data?.header ?? null;
    const d = resp?.details ?? resp?.data?.details ?? [];
    header = h;
    details = Array.isArray(d) ? d : [];
  } else {
    if (!opts?.applicationId || !opts?.userNoreg) {
      throw new Error("buildUarExcelTemplate: Untuk type 'so_user' wajib mengisi opts.applicationId dan opts.userNoreg");
    }
    const resp: any = await svcso.getUarSo(uarId, opts.applicationId, opts.userNoreg);
    const payload = resp?.header ? resp : (resp?.data ?? resp);
    header = payload?.header ?? null;

    const so = payload?.systemOwnerUsers ?? payload?.details?.systemOwnerUsers ?? [];
    const dv = payload?.divisionUsers ?? payload?.details?.divisionUsers ?? [];
    details = [...so, ...dv];
  }

  const systemName =
    (header?.APPLICATION_NAME ?? header?.applicationName) ?? fallback;

  const divisionName =
    (header?.DIVISION_NAME ?? header?.divisionName) ?? fallback;

  const departmentName =
    (header?.DEPARTMENT_NAME ?? header?.departmentName) ?? fallback;

  const createdDateRaw =
    (header?.CREATED_DT ?? header?.createdDate) ?? null;

  const monthLabel = (() => {
    const dt = createdDateRaw ? new Date(createdDateRaw) : null;
    if (!dt || Number.isNaN(dt.getTime())) return fallback;
    return `${dt.toLocaleString("en-US", { month: "short" })} ${dt.getFullYear()}`;
  })();

  const uniqueRoles: string[] = Array.from(
    new Set(details.map((d) => d?.ROLE_ID).filter(Boolean))
  );

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("User Access Review", {
    properties: { defaultRowHeight: 18 },
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  ws.views = [{ showGridLines: false }];

  const borderThin: Partial<Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const fillYellow: FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEB00" } };
  const fillBlue: FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3E3F7" } };
  const center: Partial<Alignment> = { vertical: "middle", horizontal: "center" };
  const left: Partial<Alignment> = { vertical: "middle", horizontal: "left" };

  const baseCols = [
    { key: "NO", width: 5 },
    { key: "USER_ID", width: 16 },
    { key: "NOREG", width: 14 },
    { key: "EMPLOYEE_NAME", width: 26 },
    { key: "POSITION", width: 16 },
    { key: "SECTION", width: 16 },
    { key: "DEPARTMENT", width: 18 },
    { key: "DIVISION", width: 16 },
  ];
  const roleCols = uniqueRoles.map((_, i) => ({ key: `ROLE_${i + 1}`, width: 14 }));
  const accessCols = [
    { key: "KEEP", width: 10 },
    { key: "ASSIGN_TO", width: 14 },
    { key: "DELETE", width: 10 },
  ];
  const remarkCol = [{ key: "REMARK", width: 20 }];
  const allCols = [...baseCols, ...roleCols, ...accessCols, ...remarkCol];
  ws.columns = allCols as any;

  const colIndex = (idx: number) => idx + 1;
  const firstRoleCol = colIndex(baseCols.length);
  const lastRoleCol = colIndex(baseCols.length + roleCols.length - 1);
  const accessStart = colIndex(baseCols.length + roleCols.length);
  const accessEnd = colIndex(baseCols.length + roleCols.length + accessCols.length - 1);
  const remarkIndex = colIndex(allCols.length - 1);

  const companyRow = 3;
  const titleRow = companyRow + 1;

  ws.mergeCells(companyRow, 1, companyRow, Math.max(12, remarkIndex));
  ws.getCell(companyRow, 1).value = "PT TOYOTA MOTOR MANUFACTURING INDONESIA";
  ws.getCell(companyRow, 1).font = { bold: true, size: 14 };
  ws.getCell(companyRow, 1).alignment = left as Alignment;

  ws.mergeCells(titleRow, 1, titleRow, Math.max(12, remarkIndex));
  ws.getCell(titleRow, 1).value = "USER ACCESS REVIEW";
  ws.getCell(titleRow, 1).font = { bold: true, size: 16 };
  ws.getCell(titleRow, 1).alignment = left as Alignment;

  const gapAfterTitle = 1;

  const info: [string, string][] = [
    ["SYSTEM", `:  ${v(systemName)}`],
    ["DIVISION", `:  ${v(divisionName)}`],
    ["DEPARTMENT", `:  ${v(departmentName)}`],
    ["MONTH", `:  ${v(monthLabel)}`],
  ];
  const infoStartRow = titleRow + gapAfterTitle + 1;
  info.forEach((pair, i) => {
    const r = infoStartRow + i;
    ws.getCell(r, 1).value = pair[0];
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 2).value = pair[1];
    ws.getCell(r, 1).alignment = left as Alignment;
    ws.getCell(r, 2).alignment = left as Alignment;
  });

  const apprLeftCol = Math.max(14, remarkIndex + 2);
  const apprRightCol = apprLeftCol + 5;

  ws.mergeCells(2, apprLeftCol, 2, apprRightCol);
  ws.getCell(2, apprLeftCol).value = "Approved";
  ws.getCell(2, apprLeftCol).alignment = center as Alignment;
  ws.getCell(2, apprLeftCol).font = { bold: true };

  const apprRowHeader = 3;
  const approverCols = ["System Owner", "Division Head", "Department Head"];
  const span = Math.floor((apprRightCol - apprLeftCol + 1) / 3);
  approverCols.forEach((title, idx) => {
    const c1 = apprLeftCol + idx * span;
    const c2 = c1 + span - 1;
    ws.mergeCells(apprRowHeader, c1, apprRowHeader, c2);
    const cell = ws.getCell(apprRowHeader, c1);
    cell.value = title;
    cell.alignment = center as Alignment;
    cell.font = { bold: true };
    ws.mergeCells(apprRowHeader + 1, c1, apprRowHeader + 3, c2);
  });

  for (let r = 2; r <= apprRowHeader + 3; r++) {
    for (let c = apprLeftCol; c <= apprRightCol; c++) {
      ws.getCell(r, c).border = borderThin;
    }
  }

  const gapBeforeJobRole = 2;
  const jobRoleTitleRow = infoStartRow + info.length + gapBeforeJobRole;
  ws.mergeCells(jobRoleTitleRow, 1, jobRoleTitleRow, remarkIndex);
  ws.getCell(jobRoleTitleRow, 1).value = "JOB ROLE MAPPING";
  ws.getCell(jobRoleTitleRow, 1).font = { bold: true };
  ws.getCell(jobRoleTitleRow, 1).alignment = left as Alignment;

  const hdr1 = jobRoleTitleRow + 1;
  const hdr2 = hdr1 + 1;

  ws.mergeCells(hdr1, 1, hdr2, 1); ws.getCell(hdr1, 1).value = "NO";
  ws.mergeCells(hdr1, 2, hdr2, 2); ws.getCell(hdr1, 2).value = "USER ID";
  ws.mergeCells(hdr1, 3, hdr2, 3); ws.getCell(hdr1, 3).value = "NOREG";
  ws.mergeCells(hdr1, 4, hdr2, 4); ws.getCell(hdr1, 4).value = "EMPLOYEE NAME";
  ws.mergeCells(hdr1, 5, hdr2, 5); ws.getCell(hdr1, 5).value = "POSITION";
  ws.mergeCells(hdr1, 6, hdr2, 6); ws.getCell(hdr1, 6).value = "SECTION";
  ws.mergeCells(hdr1, 7, hdr2, 7); ws.getCell(hdr1, 7).value = "DEPARTMENT";
  ws.mergeCells(hdr1, 8, hdr2, 8); ws.getCell(hdr1, 8).value = "DIVISION";

  if (uniqueRoles.length > 0) {
    if (uniqueRoles.length > 1) ws.mergeCells(hdr1, firstRoleCol, hdr1, lastRoleCol);
    ws.getCell(hdr1, firstRoleCol).value = "ROLE";
  }
  ws.mergeCells(hdr1, accessStart, hdr1, accessEnd);
  ws.getCell(hdr1, accessStart).value = "ACCESS MODIFICATION";
  ws.mergeCells(hdr1, remarkIndex, hdr2, remarkIndex);
  ws.getCell(hdr1, remarkIndex).value = "REMARK";

  uniqueRoles.forEach((roleId, i) => {
    const col = firstRoleCol + i;
    const cell = ws.getCell(hdr2, col);
    cell.value = roleId || "ROLE";
    cell.alignment = { vertical: "bottom", horizontal: "center", textRotation: 90, wrapText: false, shrinkToFit: true };
    cell.font = { bold: true };
  });
  ws.getRow(hdr2).height = 100;
  roleCols.forEach((_, i) => ws.getColumn(baseCols.length + 1 + i).width = 7);

  ws.getCell(hdr2, accessStart).value = "KEEP";
  ws.getCell(hdr2, accessStart + 1).value = "ASSIGN TO";
  ws.getCell(hdr2, accessStart + 2).value = "DELETE";

  for (let c = 1; c <= remarkIndex; c++) {
    const top = ws.getCell(hdr1, c);
    top.alignment = { vertical: "middle", horizontal: "center" } as Alignment;
    top.font = { bold: true };
    top.border = borderThin;
    top.fill = ((c >= accessStart && c <= accessEnd) || c === remarkIndex) ? fillBlue : fillYellow;

    const sub = ws.getCell(hdr2, c);
    const prev = (sub.alignment ?? {}) as Alignment;
    sub.alignment = { ...prev, vertical: "middle", horizontal: "center" };
    sub.font = { bold: true };
    sub.border = borderThin;
    sub.fill = ((c >= accessStart && c <= accessEnd) || c === remarkIndex) ? fillBlue : fillYellow;
  }

  const dataStartRow = hdr2 + 1;

  type UserGroup = { base: any; roles: Set<string> };
  const grouped: Map<string, UserGroup> = new Map();

  details.forEach((d) => {
    const u = d?.USERNAME ?? "";
    if (!grouped.has(u)) grouped.set(u, { base: d, roles: new Set<string>() });
    if (d?.ROLE_ID) grouped.get(u)!.roles.add(d.ROLE_ID);
  });

  const rowsData = Array.from(grouped.values());

  const minRows = Math.max(rowsData.length, 12);
  for (let i = 0; i < minRows; i++) {
    const row = ws.getRow(dataStartRow + i);
    for (let c = 1; c <= remarkIndex; c++) {
      const cell = row.getCell(c);
      cell.border = borderThin;
      cell.alignment = (c === 4 ? (left as Alignment) : (center as Alignment));
    }
    row.height = 18;
  }

  rowsData.forEach((g, i) => {
    const d = g.base;
    const r = dataStartRow + i;
    const row = ws.getRow(r);

    row.getCell("NO").value = i + 1;
    row.getCell("USER_ID").value       = v(d?.USERNAME);
    row.getCell("NOREG").value         = v(d?.NOREG);
    row.getCell("EMPLOYEE_NAME").value = v(d?.NAME);
    row.getCell("POSITION").value      = v(d?.POSITION_NAME);
    row.getCell("SECTION").value       = v(d?.SECTION_NAME ?? d?.SECTION_ID);
    row.getCell("DEPARTMENT").value    = v(d?.DEPARTMENT_NAME ?? d?.DEPARTMENT_ID);
    row.getCell("DIVISION").value      = v(divisionName);

    uniqueRoles.forEach((roleId, j) => {
      const col = firstRoleCol + j;
      row.getCell(col).value = g.roles.has(roleId) ? 1 : "";
    });

    const keepOk =
      yes(d?.DIV_APPROVAL_STATUS) || yes(d?.SO_APPROVAL_STATUS) || yes(d?.REVIEW_STATUS);

    row.getCell("KEEP").value = keepOk ? "1" : "";
    row.getCell("ASSIGN_TO").value = "";
    row.getCell("DELETE").value = "";
    row.getCell("REMARK").value = "";
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `UAR_${uarId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { buffer, filename };
}
