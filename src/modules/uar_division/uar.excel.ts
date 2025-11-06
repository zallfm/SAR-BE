// buildUarExcelTemplate.ts
import ExcelJS from "exceljs";
import type { FillPattern, Alignment, Borders } from "exceljs";
import { uarDivisionService as svc } from "./uar_division.service";

// NOTE: fungsi ini LANGSUNG memanggil service getUar,
// dan mengisi Excel sesuai mapping yang diminta.
export async function buildUarExcelTemplate(uarId: string, userDivisionId: number) {
    // ================== AMBIL DATA DARI SERVICE ==================
    const svcResp: any = await svc.getUar(uarId, userDivisionId);
    const header = svcResp?.header ?? svcResp?.data?.header ?? null;
    const details: any[] = svcResp?.details ?? svcResp?.data?.details ?? [];

    // ROLE unik → jadi kolom dinamis
    const uniqueRoles: string[] = Array.from(
        new Set(details.map(d => d?.ROLE_ID).filter(Boolean))
    );

    // Nilai header panel (sesuai instruksi kamu)
    const systemName = "Budget management system";
    const divisionName = header?.DIVISION_NAME ?? "";
    const departmentName = header?.DEPARTMENT_NAME ?? "";
    const date = new Date(header?.CREATED_DT ?? "");
    const monthLabel = isNaN(date.getTime())
        ? ""
        : `${date.toLocaleString("en-US", { month: "short" })} ${date.getFullYear()}`;

    // ================== MULAI BANGUN EXCEL ==================
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("User Access Review", {
        properties: { defaultRowHeight: 18 },
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    ws.views = [{ showGridLines: false }];

    // ====== Util style helpers ======
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

    // ====== Definisi kolom ======
    const baseCols = [
        { key: "NO", width: 5 },
        { key: "USER_ID", width: 14 },
        { key: "NOREG", width: 12 },
        { key: "PERSONNEL_NAME", width: 26 }, // kamu pakai PERSONNEL_NAME di header
        { key: "POSITION", width: 16 },
        { key: "SECTION", width: 16 },
        { key: "DEPARTMENT", width: 18 },
        { key: "DIVISION", width: 14 },
    ];

    // Kolom ROLE dinamis berdasarkan uniqueRoles
    const roleCols = uniqueRoles.map((_, i) => ({ key: `ROLE_${i + 1}`, width: 14 }));

    const accessCols = [
        { key: "KEEP", width: 10 },
        { key: "ASSIGN_TO", width: 14 },
        { key: "DELETE", width: 10 },
    ];

    const remarkCol = [{ key: "REMARK", width: 20 }];

    const allCols = [...baseCols, ...roleCols, ...accessCols, ...remarkCol];
    ws.columns = allCols as any;

    // Helper index
    const colIndex = (idx: number) => idx + 1; // 0-based -> Excel 1-based
    const firstRoleCol = colIndex(baseCols.length);
    const lastRoleCol = colIndex(baseCols.length + roleCols.length - 1);
    const accessStart = colIndex(baseCols.length + roleCols.length);
    const accessEnd = colIndex(baseCols.length + roleCols.length + accessCols.length - 1);
    const remarkIndex = colIndex(allCols.length - 1);


    // ====== Header Atas ======
    const companyRow = 3;
    const titleRow = companyRow + 1;

    ws.mergeCells(companyRow, 1, companyRow, 12);
    ws.getCell(companyRow, 1).value = "PT TOYOTA MOTOR MANUFACTURING INDONESIA";
    ws.getCell(companyRow, 1).font = { bold: true, size: 14 };
    ws.getCell(companyRow, 1).alignment = left as Alignment;

    ws.mergeCells(titleRow, 1, titleRow, 12);
    ws.getCell(titleRow, 1).value = "USER ACCESS REVIEW";
    ws.getCell(titleRow, 1).font = { bold: true, size: 16 };
    ws.getCell(titleRow, 1).alignment = left as Alignment;

    const gapAfterTitle = 1;

    // Info fields (SYSTEM, DIVISION, DEPARTMENT, MONTH)
    const info: [string, string][] = [
        ["SYSTEM", `:  ${systemName}`],
        ["DIVISION", `:  ${divisionName}`],
        ["DEPARTMENT", `:  ${departmentName}`],
        ["MONTH", `:  ${monthLabel}`],
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

    // ====== Approval Box (kanan atas) ======
    const apprLeftCol = 14;
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
        // area tanda tangan (dua baris kosong)
        ws.mergeCells(apprRowHeader + 1, c1, apprRowHeader + 3, c2);
    });

    for (let r = 2; r <= apprRowHeader + 3; r++) {
        for (let c = apprLeftCol; c <= apprRightCol; c++) {
            ws.getCell(r, c).border = borderThin;
        }
    }

    // ====== Judul kecil “JOB ROLE MAPPING” ======
    const gapBeforeJobRole = 2;
    const jobRoleTitleRow = infoStartRow + info.length + gapBeforeJobRole;
    ws.mergeCells(jobRoleTitleRow, 1, jobRoleTitleRow, remarkIndex);
    ws.getCell(jobRoleTitleRow, 1).value = "JOB ROLE MAPPING";
    ws.getCell(jobRoleTitleRow, 1).font = { bold: true };
    ws.getCell(jobRoleTitleRow, 1).alignment = left as Alignment;

    // ====== Header Tabel (2 baris) ======
    const hdr1 = jobRoleTitleRow + 1;
    const hdr2 = hdr1 + 1;

    // Grup kolom statis (No s/d Division)
    ws.mergeCells(hdr1, 1, hdr2, 1); ws.getCell(hdr1, 1).value = "NO";
    ws.mergeCells(hdr1, 2, hdr2, 2); ws.getCell(hdr1, 2).value = "USER ID";
    ws.mergeCells(hdr1, 3, hdr2, 3); ws.getCell(hdr1, 3).value = "NOREG";
    ws.mergeCells(hdr1, 4, hdr2, 4); ws.getCell(hdr1, 4).value = "EMPLOYEE NAME";
    ws.mergeCells(hdr1, 5, hdr2, 5); ws.getCell(hdr1, 5).value = "POSITION";
    ws.mergeCells(hdr1, 6, hdr2, 6); ws.getCell(hdr1, 6).value = "SECTION";
    ws.mergeCells(hdr1, 7, hdr2, 7); ws.getCell(hdr1, 7).value = "DEPARTMENT";
    ws.mergeCells(hdr1, 8, hdr2, 8); ws.getCell(hdr1, 8).value = "DIVISION";

    // Grup ROLE (dinamis) — merge baris 1 dari firstRoleCol..lastRoleCol
    if (uniqueRoles.length > 0) {
        if (uniqueRoles.length > 1) {
            ws.mergeCells(hdr1, firstRoleCol, hdr1, lastRoleCol);
        }
        ws.getCell(hdr1, firstRoleCol).value = "ROLE";
    }


    // Grup ACCESS MODIFICATION
    ws.mergeCells(hdr1, accessStart, hdr1, accessEnd);
    ws.getCell(hdr1, accessStart).value = "ACCESS MODIFICATION";

    // REMARK
    ws.mergeCells(hdr1, remarkIndex, hdr2, remarkIndex);
    ws.getCell(hdr1, remarkIndex).value = "REMARK";

    // Sub header — tulis ROLE_ID per kolom role
    uniqueRoles.forEach((roleId, i) => {
        const col = firstRoleCol + i;
        const cell = ws.getCell(hdr2, col);

        cell.value = roleId || "ROLE";
        cell.alignment = {
            vertical: "bottom",     // mulai dari bawah
            horizontal: "center",     // rata kiri
            textRotation: 90,       // arah dari bawah ke atas
            wrapText: false,
            shrinkToFit: true,
        };
        cell.font = { bold: true };
    });

    ws.getRow(hdr2).height = 100; // sesuaikan 90–120

    // Lebar kolom ROLE (lebih sempit biasanya pas untuk vertikal)
    roleCols.forEach((_, i) => {
        ws.getColumn(baseCols.length + 1 + i).width = 7; // 7–9 oke
    });


    // Sub header untuk kolom akses
    ws.getCell(hdr2, accessStart).value = "KEEP";
    ws.getCell(hdr2, accessStart + 1).value = "ASSIGN TO";
    ws.getCell(hdr2, accessStart + 2).value = "DELETE";

    // Styling header
    for (let c = 1; c <= remarkIndex; c++) {
        const top = ws.getCell(hdr1, c);
        top.alignment = { vertical: "middle", horizontal: "center" };
        top.font = { bold: true };
        top.border = borderThin;
        top.fill = ((c >= accessStart && c <= accessEnd) || c === remarkIndex) ? fillBlue : fillYellow;

        const sub = ws.getCell(hdr2, c);
        const prev = (sub.alignment ?? {}) as Alignment;
        sub.alignment = {
            ...prev,                    // ← pertahankan textRotation/-wrap/shrinkToFit
            vertical: "middle",
            horizontal: "center",
        };
        sub.font = { bold: true };
        sub.border = borderThin;
        sub.fill = ((c >= accessStart && c <= accessEnd) || c === remarkIndex) ? fillBlue : fillYellow;
    }


    // ====== Data Rows (pivot per USERNAME, one-hot role) ======
    const dataStartRow = hdr2 + 1;

    // Group per user (USERNAME) → kumpulkan set ROLE_ID
    type UserGroup = { base: any; roles: Set<string> };
    const grouped: Map<string, UserGroup> = new Map();
    details.forEach(d => {
        const u = d?.USERNAME ?? "";
        if (!grouped.has(u)) grouped.set(u, { base: d, roles: new Set<string>() });
        if (d?.ROLE_ID) grouped.get(u)!.roles.add(d.ROLE_ID);
    });
    const rowsData = Array.from(grouped.values());


    // Siapkan jumlah baris minimal (12) atau sebanyak user
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

    // Isi data per user (one row per user)
    rowsData.forEach((g, i) => {
        const d = g.base;
        const r = dataStartRow + i;
        const row = ws.getRow(r);

        // NO
        row.getCell("NO").value = i + 1;

        // USER ID -> USERNAME
        row.getCell("USER_ID").value = d.USERNAME ?? "";

        // NOREG
        row.getCell("NOREG").value = d.NOREG ?? "";

        // EMPLOYEE NAME -> sesuai mapping awal kamu: pakai POSITION_NAME (fallback NAME)
        row.getCell("PERSONNEL_NAME").value = d.POSITION_NAME ?? d.NAME ?? "";

        // POSITION -> POSITION_NAME
        row.getCell("POSITION").value = d.POSITION_NAME ?? "";

        // SECTION -> SECTION_NAME
        row.getCell("SECTION").value = d.SECTION_NAME ?? "";

        // DEPARTMENT -> (awal permintaan: DEPARTMENT_ID; ganti ke NAME kalau mau)
        row.getCell("DEPARTMENT").value = d.DEPARTMENT_ID ?? "";

        // DIVISION -> dari header
        row.getCell("DIVISION").value = divisionName;

        // Kolom role dinamis: 1 jika user punya role tsb
        uniqueRoles.forEach((roleId, j) => {
            const col = firstRoleCol + j;
            row.getCell(col).value = g.roles.has(roleId) ? 1 : "";
        });

        // Kosongkan kolom aksi/remark
        row.getCell("KEEP").value = d.DIV_APPROVAL_STATUS === "1" ? "1" : undefined;
        row.getCell("ASSIGN_TO").value = "";
        row.getCell("DELETE").value = "";
        row.getCell("REMARK").value = "";
    });

    // ====== Return buffer + filename ======
    const buffer = await wb.xlsx.writeBuffer();
    const filename = `UAR_${uarId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { buffer, filename };
}
