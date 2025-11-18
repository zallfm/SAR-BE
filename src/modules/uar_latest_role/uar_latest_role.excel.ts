import ExcelJS from "exceljs";
import type { FillPattern, Alignment, Borders } from "exceljs";
import { uarLatestRoleService } from "./uar_latest_role.service";

type ExportFilters = {
  applicationId?: string;
  username?: string;
  noreg?: string;
  roleId?: string;
  divisionId?: number;
  departmentId?: number;
  search?: string;
};

export async function buildUarLatestRoleExcel(filters: ExportFilters) {
  const data = await uarLatestRoleService.getAllForExport(filters);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("User Access Role List", {
    properties: { defaultRowHeight: 18 },
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  ws.views = [{ showGridLines: true }];

  // Define borders and fills
  const borderThin: Partial<Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  const fillGrey: FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  const center: Partial<Alignment> = { vertical: "middle", horizontal: "center" };
  const left: Partial<Alignment> = { vertical: "middle", horizontal: "left" };

  // Define columns
  const columns = [
    { key: "NO", width: 8 },
    { key: "APPLICATION_ID", width: 18 },
    { key: "USERNAME", width: 20 },
    { key: "NOREG", width: 12 },
    { key: "NAME", width: 25 },
    { key: "ROLE_ID", width: 18 },
    { key: "ROLE_DESCRIPTION", width: 30 },
    { key: "NAME_APP", width: 25 },
    { key: "ROLE_NAME", width: 25 },
    { key: "DIVISION_ID", width: 15 },
    { key: "DIVISION_NAME", width: 25 },
    { key: "DEPARTMENT_ID", width: 15 },
    { key: "DEPARTMENT_NAME", width: 25 },
    { key: "POSITION_TITLE", width: 25 },
    { key: "CREATED_BY", width: 18 },
    { key: "CREATED_DT", width: 20 },
    { key: "CHANGED_BY", width: 18 },
    { key: "CHANGED_DT", width: 20 },
  ];

  ws.columns = columns as any;

  // Title row
  const titleRow = 1;
  ws.mergeCells(titleRow, 1, titleRow, columns.length);
  const titleCell = ws.getCell(titleRow, 1);
  titleCell.value = "User Access Role List";
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.font = { bold: true, size: 14 };
  ws.getRow(titleRow).height = 25;

  // Header row
  const headerRow = 2;
  const headerValues = [
    "No",
    "Application ID",
    "Username",
    "Noreg",
    "Name",
    "Role ID",
    "Role Description",
    "Name App",
    "Role Name",
    "Division ID",
    "Division Name",
    "Department ID",
    "Department Name",
    "Position Title",
    "Created By",
    "Created Date",
    "Changed By",
    "Changed Date",
  ];

  ws.addRow(headerValues);

  // Style header row
  const headerRowObj = ws.getRow(headerRow);
  headerRowObj.height = 20;
  headerRowObj.font = { bold: true };
  headerRowObj.fill = fillGrey;
  headerRowObj.alignment = center as Alignment;

  columns.forEach((_, colIndex) => {
    const cell = headerRowObj.getCell(colIndex + 1);
    cell.border = borderThin;
  });

  // Format date helper
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateTime = (date: Date | null | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  };

  // Data rows
  data.forEach((row, index) => {
    const rowNumber = headerRow + 1 + index;
    const rowData = [
      index + 1,
      row.APPLICATION_ID || "",
      row.USERNAME || "",
      row.NOREG || "",
      row.NAME || "",
      row.ROLE_ID || "",
      row.ROLE_DESCRIPTION || "",
      row.NAME_APP || "",
      row.ROLE_NAME || "",
      row.DIVISION_ID ?? "",
      row.DIVISION_NAME || "",
      row.DEPARTMENT_ID ?? "",
      row.DEPARTMENT_NAME || "",
      row.POSITION_TITLE || "",
      row.CREATED_BY || "",
      formatDateTime(row.CREATED_DT),
      row.CHANGED_BY || "",
      formatDateTime(row.CHANGED_DT),
    ];

    ws.addRow(rowData);

    const rowObj = ws.getRow(rowNumber);
    rowObj.height = 18;

    columns.forEach((col, colIndex) => {
      const cell = rowObj.getCell(colIndex + 1);
      cell.border = borderThin;
      
      // Left align for text columns, center for numbers and dates
      // Column indices: 0=No, 9=Division ID, 11=Department ID, 14=Created Date, 16=Changed Date
      if (colIndex === 0 || colIndex === 9 || colIndex === 11) {
        // No, Division ID, Department ID - center
        cell.alignment = center as Alignment;
      } else if (colIndex === 14 || colIndex === 16) {
        // Date columns (Created Date, Changed Date) - center
        cell.alignment = center as Alignment;
      } else {
        // Text columns - left
        cell.alignment = left as Alignment;
      }
    });
  });

  // Add exported date at the bottom
  const exportedDateRow = headerRow + 1 + data.length + 1;
  ws.mergeCells(exportedDateRow, 1, exportedDateRow, columns.length);
  const exportedDateCell = ws.getCell(exportedDateRow, 1);
  
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  
  exportedDateCell.value = `Exported Date: ${day}/${month}/${year}, ${hours}.${minutes}.${seconds}`;
  exportedDateCell.alignment = { vertical: "middle", horizontal: "left" };
  exportedDateCell.font = { italic: true };
  ws.getRow(exportedDateRow).height = 20;

  // Generate buffer and filename
  const buffer = await wb.xlsx.writeBuffer();
  const dateStamp = `${year}${month}${day}`;
  const filename = `UAR_Latest_Role_${dateStamp}.xlsx`;

  return { buffer, filename };
}

