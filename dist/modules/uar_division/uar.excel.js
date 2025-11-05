import ExcelJS from "exceljs";
export async function buildUarExcelTemplate(params) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("User Access Review", {
        properties: { defaultRowHeight: 18 },
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });
    ws.views = [{ showGridLines: false }];
    // ====== Util style helpers (DITIPKAN) ======
    const borderThin = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
    };
    const fillYellow = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEB00" }, // kuning
    };
    const fillBlue = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3E3F7" }, // biru muda
    };
    const center = { vertical: "middle", horizontal: "center" };
    const left = { vertical: "middle", horizontal: "left" };
    // ====== Lebar kolom dasar ======
    const baseCols = [
        { key: "NO", width: 5 },
        { key: "USER_ID", width: 14 },
        { key: "NOREG", width: 12 },
        { key: "EMPLOYEE_NAME", width: 26 },
        { key: "POSITION", width: 16 },
        { key: "SECTION", width: 16 },
        { key: "DEPARTMENT", width: 18 },
        { key: "DIVISION", width: 14 },
    ];
    const roleCount = Math.max(params.roleColumns.length, 1);
    const roleCols = Array.from({ length: roleCount }).map((_, i) => ({
        key: `ROLE_${i + 1}`,
        width: 14,
    }));
    const accessCols = [
        { key: "KEEP", width: 10 },
        { key: "ASSIGN_TO", width: 14 },
        { key: "DELETE", width: 10 },
    ];
    const remarkCol = [{ key: "REMARK", width: 20 }];
    const allCols = [...baseCols, ...roleCols, ...accessCols, ...remarkCol];
    ws.columns = allCols; // ExcelJS types longgar untuk columns; aman di-cast
    // Cari indeks kolom untuk merge/box
    const colIndex = (idx) => idx + 1; // 0-based -> Excel 1-based
    const firstRoleCol = colIndex(baseCols.length);
    const lastRoleCol = colIndex(baseCols.length + roleCols.length - 1);
    const accessStart = colIndex(baseCols.length + roleCols.length);
    const accessEnd = colIndex(baseCols.length + roleCols.length + accessCols.length - 1);
    const remarkIndex = colIndex(allCols.length - 1);
    // ====== Header Atas ======
    // Row 1: 
    const companyRow = 3; // "PT TOYOTA ..."
    const titleRow = companyRow + 1;
    ws.mergeCells(companyRow, 1, companyRow, 12);
    ws.getCell(companyRow, 1).value = "PT TOYOTA MOTOR MANUFACTURING INDONESIA";
    ws.getCell(companyRow, 1).font = { bold: true, size: 14 };
    ws.getCell(companyRow, 1).alignment = left;
    // Row 2: Title
    ws.mergeCells(titleRow, 1, titleRow, 12);
    ws.getCell(titleRow, 1).value = "USER ACCESS REVIEW";
    ws.getCell(titleRow, 1).font = { bold: true, size: 16 };
    ws.getCell(titleRow, 1).alignment = left;
    const gapAfterTitle = 1;
    // Info fields (SYSTEM, DIVISION, DEPARTMENT, MONTH)
    // const infoStartRow = 6;
    const info = [
        ["SYSTEM", `:  ${params.systemName}`],
        ["DIVISION", `:  ${params.divisionName}`],
        ["DEPARTMENT", `:  ${params.departmentName}`],
        ["MONTH", `:  ${params.monthLabel}`],
    ];
    const infoStartRow = titleRow + gapAfterTitle + 1;
    info.forEach((pair, i) => {
        const r = infoStartRow + i;
        ws.getCell(r, 1).value = pair[0];
        ws.getCell(r, 1).font = { bold: true };
        ws.getCell(r, 2).value = pair[1];
        ws.getCell(r, 1).alignment = left;
        ws.getCell(r, 2).alignment = left;
    });
    // ====== Approval Box di kanan atas ======
    // Kotak 6 kolom lebar (bisa disesuaikan); posisikan mulai kolom 14
    const apprLeftCol = 14;
    const apprRightCol = apprLeftCol + 5;
    // Judul "Approved"
    ws.mergeCells(2, apprLeftCol, 2, apprRightCol);
    ws.getCell(2, apprLeftCol).value = "Approved";
    ws.getCell(2, apprLeftCol).alignment = center;
    ws.getCell(2, apprLeftCol).font = { bold: true };
    // Header kolom approver
    const apprRowHeader = 3;
    const approverCols = ["System Owner", "Division Head", "Department Head"];
    // Bagi rata 3 bagian dalam 6 kolom
    const span = Math.floor((apprRightCol - apprLeftCol + 1) / 3); // 2 kol / kolom
    approverCols.forEach((title, idx) => {
        const c1 = apprLeftCol + idx * span;
        const c2 = c1 + span - 1;
        ws.mergeCells(apprRowHeader, c1, apprRowHeader, c2);
        const cell = ws.getCell(apprRowHeader, c1);
        cell.value = title;
        cell.alignment = center;
        cell.font = { bold: true };
        // area tanda tangan (dua baris kosong)
        ws.mergeCells(apprRowHeader + 1, c1, apprRowHeader + 3, c2);
    });
    // Border untuk box
    for (let r = 2; r <= apprRowHeader + 3; r++) {
        for (let c = apprLeftCol; c <= apprRightCol; c++) {
            ws.getCell(r, c).border = borderThin;
        }
    }
    // ====== Judul kecil “JOB ROLE MAPPING” di atas tabel ======
    const gapBeforeJobRole = 2;
    const jobRoleTitleRow = infoStartRow + info.length + gapBeforeJobRole;
    ws.mergeCells(jobRoleTitleRow, 1, jobRoleTitleRow, remarkIndex);
    ws.getCell(jobRoleTitleRow, 1).value = "JOB ROLE MAPPING";
    ws.getCell(jobRoleTitleRow, 1).font = { bold: true };
    ws.getCell(jobRoleTitleRow, 1).alignment = left;
    // ====== Header Tabel (2 baris header) ======
    // Baris 1 header (judul grup)
    const hdr1 = jobRoleTitleRow + 1;
    const hdr2 = hdr1 + 1;
    // Grup kolom statis (No s/d Division)
    ws.mergeCells(hdr1, 1, hdr2, 1);
    ws.getCell(hdr1, 1).value = "NO";
    ws.mergeCells(hdr1, 2, hdr2, 2);
    ws.getCell(hdr1, 2).value = "USER ID";
    ws.mergeCells(hdr1, 3, hdr2, 3);
    ws.getCell(hdr1, 3).value = "NOREG";
    ws.mergeCells(hdr1, 4, hdr2, 4);
    ws.getCell(hdr1, 4).value = "EMPLOYEE NAME";
    ws.mergeCells(hdr1, 5, hdr2, 5);
    ws.getCell(hdr1, 5).value = "POSITION";
    ws.mergeCells(hdr1, 6, hdr2, 6);
    ws.getCell(hdr1, 6).value = "SECTION";
    ws.mergeCells(hdr1, 7, hdr2, 7);
    ws.getCell(hdr1, 7).value = "DEPARTMENT";
    ws.mergeCells(hdr1, 8, hdr2, 8);
    ws.getCell(hdr1, 8).value = "DIVISION";
    // Grup ROLE (dinamis)
    if (roleCount > 1) {
        ws.mergeCells(hdr1, firstRoleCol, hdr1, lastRoleCol);
    }
    ws.getCell(hdr1, firstRoleCol).value = "ROLE";
    // Grup ACCESS MODIFICATION
    ws.mergeCells(hdr1, accessStart, hdr1, accessEnd);
    ws.getCell(hdr1, accessStart).value = "ACCESS MODIFICATION";
    // REMARK
    ws.mergeCells(hdr1, remarkIndex, hdr2, remarkIndex);
    ws.getCell(hdr1, remarkIndex).value = "REMARK";
    // Baris 2 header (sub kolom)
    // Role subheaders
    params.roleColumns.forEach((title, i) => {
        const col = firstRoleCol + i;
        const cell = ws.getCell(hdr2, col);
        cell.value = title || `ROLE ${i + 1}`;
        cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            textRotation: 255, // ⬅️ vertical text (bukan 90)
            wrapText: true,
        };
    });
    // Access subheaders
    ws.getCell(hdr2, accessStart).value = "KEEP";
    ws.getCell(hdr2, accessStart + 1).value = "ASSIGN TO";
    ws.getCell(hdr2, accessStart + 2).value = "DELETE";
    // Styling header (kuning / biru) — pakai fill yang sudah DIKETIK
    for (let c = 1; c <= remarkIndex; c++) {
        const cellTop = ws.getCell(hdr1, c);
        cellTop.alignment = center;
        cellTop.font = { bold: true };
        cellTop.border = borderThin;
        if (c >= accessStart && c <= accessEnd || c === remarkIndex)
            cellTop.fill = fillBlue;
        else
            cellTop.fill = fillYellow;
    }
    for (let c = 1; c <= remarkIndex; c++) {
        const cell = ws.getCell(hdr2, c);
        cell.alignment = center;
        cell.font = { bold: true };
        cell.border = borderThin;
        if (c >= accessStart && c <= accessEnd || c === remarkIndex)
            cell.fill = fillBlue;
        else
            cell.fill = fillYellow;
    }
    // ====== Baris data kosong (misal 12 baris) ======
    const dataStartRow = hdr2 + 1;
    const emptyRows = 12;
    for (let r = 0; r < emptyRows; r++) {
        const row = ws.getRow(dataStartRow + r);
        for (let c = 1; c <= remarkIndex; c++) {
            const cell = row.getCell(c);
            cell.border = borderThin;
            cell.alignment = (c === 4 ? left : center); // EMPLOYEE NAME kiri, lainnya center
        }
        row.height = 18;
    }
    // ====== Kembalikan buffer + filename ======
    const buffer = await wb.xlsx.writeBuffer();
    const filename = `UAR_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { buffer, filename };
}
