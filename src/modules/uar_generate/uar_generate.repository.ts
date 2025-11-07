import { prisma } from "../../db/prisma";

type TxLike = { $queryRaw<T = unknown>(...args: any[]): Promise<T> };

type MergeCount = { inserted: number; updated: number };
type GenParams = { period: string; application_id: string; createdBy: string };

/**
 * DIVISION USER:
 * - Sumber: TB_M_AUTH_MAPPING (NOREG valid)
 * - Step: INSERT/UPSERT ke TB_R_WORKFLOW (SEQ_NO = 1) -> MERGE ke TB_R_UAR_DIVISION_USER
 */

/**
 * DIVISION USER:
 * - Sumber: TB_M_AUTH_MAPPING (NOREG valid)
 * - Step: INSERT/UPSERT ke TB_R_WORKFLOW (SEQ_NO = 1) -> MERGE ke TB_R_UAR_DIVISION_USER
 */
async function mergeDivisionUserTx(tx: TxLike, p: GenParams): Promise<MergeCount> {
  const rows = await tx.$queryRaw<{ inserted: number; updated: number }[]>`
SET XACT_ABORT ON;

DECLARE @PERIOD_RAW NVARCHAR(30) = ${p.period};
DECLARE @APP_ID     NVARCHAR(50) = ${p.application_id};
DECLARE @APP_ID     NVARCHAR(50) = ${p.application_id};
DECLARE @CREATED_BY VARCHAR(50)  = ${p.createdBy};

-- =========================
-- Normalisasi periode UAR => YYYYMM
-- =========================
-- =========================
-- Normalisasi periode UAR => YYYYMM
-- =========================
DECLARE @UAR_PERIOD CHAR(6);
IF @PERIOD_RAW LIKE '[0-9][0-9][0-9][0-9][0-9][0-9]'
  SET @UAR_PERIOD = @PERIOD_RAW;
ELSE
BEGIN
  DECLARE @RUN_DATE DATE = TRY_CONVERT(DATE, @PERIOD_RAW, 126);
  IF @RUN_DATE IS NULL SET @RUN_DATE = TRY_CONVERT(DATE, @PERIOD_RAW);
  IF @RUN_DATE IS NULL THROW 50000, 'Invalid period. Use YYYYMM or ISO date (YYYY-MM-DD).', 1;
  SET @UAR_PERIOD = LEFT(CONVERT(CHAR(8), @RUN_DATE, 112), 6);
END

DECLARE @UAR_ID NVARCHAR(50) = CONCAT('UAR_', @UAR_PERIOD, '_', @APP_ID);

-- =========================
-- Sumber data (hanya karyawan yang termapping ke APP_ID)
-- =========================
IF OBJECT_ID('tempdb..#base') IS NOT NULL DROP TABLE #base;

SELECT
  e.DIVISION_ID,
  e.DEPARTMENT_ID,
  e.NOREG,
  e.PERSONNEL_NAME,
  e.POSITION_NAME,
  e.SECTION_ID,
  e.POSITION_TITLE,
  e.JOB_CODE,
  e.JOB_TITLE,
  e.MAIL,
  e.POSITION_LEVEL
INTO #base
FROM TB_M_EMPLOYEE e
JOIN TB_M_AUTH_MAPPING am
  ON am.NOREG = e.NOREG
 WHERE am.APPLICATION_ID = @APP_ID
 AND am.NOREG NOT LIKE 'EMP%'

-- =========================
-- Ranking per group (DIVISION_ID + DEPARTMENT_ID)
-- Head = POSITION_NAME LIKE '%DivHead%'
-- Staff = selain head
-- =========================
IF OBJECT_ID('tempdb..#ranked') IS NOT NULL DROP TABLE #ranked;

SELECT
  b.*,
  CASE WHEN b.POSITION_NAME LIKE '%Div Head%' THEN 0 ELSE 1 END AS is_head_first,
  ROW_NUMBER() OVER (
    PARTITION BY b.DIVISION_ID, b.DEPARTMENT_ID
    ORDER BY
      CASE WHEN b.POSITION_NAME LIKE '%Div Head%' THEN 0 ELSE 1 END,
      ISNULL(b.POSITION_LEVEL,0) DESC,
      b.NOREG
  ) AS rn_by_pref,
  SUM(CASE WHEN b.POSITION_NAME LIKE '%Div Head%' THEN 1 ELSE 0 END)
    OVER (PARTITION BY b.DIVISION_ID, b.DEPARTMENT_ID) AS cnt_head_in_grp
INTO #ranked
FROM #base b;

-- Head terpilih: WAJIB "DivHead" (tanpa fallback)
IF OBJECT_ID('tempdb..#pick_head') IS NOT NULL DROP TABLE #pick_head;

SELECT
  r.DIVISION_ID,
  r.DEPARTMENT_ID,
  r.NOREG         AS HEAD_NOREG,
  r.PERSONNEL_NAME AS HEAD_NAME
INTO #pick_head
FROM #ranked r
WHERE r.cnt_head_in_grp > 0
  AND r.is_head_first = 0
  AND r.rn_by_pref = 1;

-- Staff = semua yang bukan head
IF OBJECT_ID('tempdb..#staff') IS NOT NULL DROP TABLE #staff;

SELECT r.*
INTO #staff
FROM #ranked r
LEFT JOIN #pick_head h
  ON  h.DIVISION_ID   = r.DIVISION_ID
  AND h.DEPARTMENT_ID = r.DEPARTMENT_ID
  AND h.HEAD_NOREG    = r.NOREG
WHERE h.HEAD_NOREG IS NULL;  -- exclude head

-- =========================
-- MERGE Header: TB_R_WORKFLOW (SEQ=1, Division)
-- Approver = DivHead
-- =========================
;WITH head_src AS (
  SELECT DISTINCT
    @UAR_ID AS UAR_ID,
    1       AS SEQ_NO,
    h.DIVISION_ID,
    h.DEPARTMENT_ID,
    h.HEAD_NOREG   AS APPROVER_NOREG,
    h.HEAD_NAME    AS APPROVER_NAME
  FROM #pick_head h
),
head_with_plan AS (
  SELECT
    x.*,
    cfg.VALUE_NUM AS OFFSET_DAYS,
    DATEADD(DAY, ISNULL(cfg.VALUE_NUM,0), CAST(SYSDATETIME() AS DATE)) AS PLAN_APPROVED_DT
  FROM head_src x
  OUTER APPLY (
    SELECT TOP 1 s.VALUE_NUM
    FROM TB_M_SYSTEM s
    WHERE s.SYSTEM_TYPE = 'UAR_PLAN'
      AND SYSDATETIME() BETWEEN s.VALID_FROM_DT AND ISNULL(s.VALID_TO_DT, '9999-12-31')
      AND (
           s.SYSTEM_CD = 'DH' OR
           s.SYSTEM_CD = 'DEFAULT'
      )
    ORDER BY
      CASE
        WHEN s.SYSTEM_CD = 'DH'                      THEN 1
        WHEN s.SYSTEM_CD = 'DEFAULT'                 THEN 2
        ELSE 99
      END
  ) cfg
)
MERGE TB_R_WORKFLOW WITH (HOLDLOCK) AS wf
USING head_with_plan AS x
  ON ( wf.UAR_ID = x.UAR_ID
       AND wf.SEQ_NO = x.SEQ_NO
       AND wf.DIVISION_ID = x.DIVISION_ID
       AND ISNULL(wf.DEPARTMENT_ID,'') = ISNULL(x.DEPARTMENT_ID,'') )
WHEN NOT MATCHED THEN
  INSERT (UAR_ID, SEQ_NO, DIVISION_ID, DEPARTMENT_ID,
          APPROVAL_CD, APPROVAL_DESC,
          APPROVER_NOREG, APPROVER_NAME,
          PLAN_APPROVED_DT,
          CREATED_BY, CREATED_DT)
  VALUES (x.UAR_ID, x.SEQ_NO, x.DIVISION_ID, x.DEPARTMENT_ID,
          1, 'Division Approval',
          x.APPROVER_NOREG, x.APPROVER_NAME,
          x.PLAN_APPROVED_DT,
          ${p.createdBy}, SYSDATETIME())
WHEN MATCHED THEN
  UPDATE SET
    wf.APPROVER_NOREG = x.APPROVER_NOREG,
    wf.APPROVER_NAME  = x.APPROVER_NAME,
    wf.PLAN_APPROVED_DT = x.PLAN_APPROVED_DT,
    wf.CHANGED_BY     = ${p.createdBy},
    wf.CHANGED_DT     = SYSDATETIME();

-- =========================
-- MERGE Detail: TB_R_UAR_DIVISION_USER (staff)
-- Join kembali ke AUTH_MAPPING supaya dapat USERNAME/ROLE_ID/APPLICATION_ID
-- Reviewer kolom (jika perlu) kita isi head per group (DIVISION/DEPARTMENT)
-- =========================
DECLARE @chg TABLE (action NVARCHAR(10));

;WITH staff_enriched AS (
  SELECT
    @UAR_PERIOD AS UAR_PERIOD,
    @UAR_ID     AS UAR_ID,
    am.USERNAME,
    am.ROLE_ID,
    am.APPLICATION_ID,
    s.DIVISION_ID,
    s.DEPARTMENT_ID,
    s.NOREG,
    s.PERSONNEL_NAME AS NAME,
    s.POSITION_NAME,
    s.SECTION_ID,
    s.POSITION_TITLE,
    s.JOB_CODE,
    s.JOB_TITLE,
    s.MAIL,
    h.HEAD_NOREG     AS REVIEWER_NOREG,
    h.HEAD_NAME      AS REVIEWER_NAME
  FROM #staff s
  JOIN TB_M_AUTH_MAPPING am
    ON am.NOREG = s.NOREG
   AND am.APPLICATION_ID = @APP_ID
  LEFT JOIN #pick_head h
    ON  h.DIVISION_ID   = s.DIVISION_ID
    AND h.DEPARTMENT_ID = s.DEPARTMENT_ID
)
MERGE TB_R_UAR_DIVISION_USER AS tgt
USING staff_enriched AS src
  ON ( tgt.UAR_ID        = src.UAR_ID
       AND tgt.APPLICATION_ID = src.APPLICATION_ID
       AND tgt.USERNAME  = src.USERNAME
       AND tgt.ROLE_ID   = src.ROLE_ID )
WHEN NOT MATCHED THEN
  INSERT (
    UAR_PERIOD, UAR_ID, USERNAME, ROLE_ID, APPLICATION_ID,
    DIVISION_ID, DEPARTMENT_ID, NOREG, NAME, POSITION_NAME, SECTION_ID,
    REVIEWER_NOREG, REVIEWER_NAME,
    CREATED_BY, CREATED_DT
  )
  VALUES (
    src.UAR_PERIOD, src.UAR_ID, src.USERNAME, src.ROLE_ID, src.APPLICATION_ID,
    src.DIVISION_ID, src.DEPARTMENT_ID, src.NOREG, src.NAME, src.POSITION_NAME, src.SECTION_ID,
    src.REVIEWER_NOREG, src.REVIEWER_NAME,
    ${p.createdBy}, SYSDATETIME()
  )
WHEN MATCHED THEN
  UPDATE SET
    tgt.DIVISION_ID     = src.DIVISION_ID,
    tgt.DEPARTMENT_ID   = src.DEPARTMENT_ID,
    tgt.NOREG           = src.NOREG,
    tgt.NAME            = src.NAME,
    tgt.POSITION_NAME   = src.POSITION_NAME,
    tgt.SECTION_ID      = src.SECTION_ID,
    tgt.REVIEWER_NOREG  = COALESCE(src.REVIEWER_NOREG, tgt.REVIEWER_NOREG),
    tgt.REVIEWER_NAME   = COALESCE(src.REVIEWER_NAME , tgt.REVIEWER_NAME ),
    tgt.CHANGED_BY      = ${p.createdBy},
    tgt.CHANGED_DT      = SYSDATETIME()
OUTPUT $action INTO @chg;

-- Cleanup
DROP TABLE IF EXISTS #staff;
DROP TABLE IF EXISTS #pick_head;
DROP TABLE IF EXISTS #ranked;
DROP TABLE IF EXISTS #base;

-- Result
SELECT
  SUM(CASE WHEN action='INSERT' THEN 1 ELSE 0 END) AS inserted,
  SUM(CASE WHEN action='UPDATE' THEN 1 ELSE 0 END) AS updated
FROM @chg;`;

  return rows?.[0] ?? { inserted: 0, updated: 0 };
}




/**
 * SYSTEM OWNER:
 * - Sumber: TB_M_AUTH_MAPPING (NOREG kosong/all-zero)
 * - Step: INSERT/UPSERT ke TB_R_WORKFLOW (SEQ_NO = 2) -> MERGE ke TB_R_UAR_SYSTEM_OWNER
 */
async function mergeSystemOwnerTx(tx: TxLike, p: GenParams): Promise<MergeCount> {
  const rows = await tx.$queryRaw<{ inserted: number; updated: number }[]>`
SET XACT_ABORT ON;

DECLARE @PERIOD_RAW NVARCHAR(30) = ${p.period};
DECLARE @APP_ID     NVARCHAR(50) = ${p.application_id};
DECLARE @CREATED_BY VARCHAR(50)  = ${p.createdBy};

-- =========================
-- Normalisasi periode UAR => YYYYMM
-- =========================
DECLARE @UAR_PERIOD CHAR(6);
IF @PERIOD_RAW LIKE '[0-9][0-9][0-9][0-9][0-9][0-9]'
  SET @UAR_PERIOD = @PERIOD_RAW;
ELSE
BEGIN
  DECLARE @RUN_DATE DATE = TRY_CONVERT(DATE, @PERIOD_RAW, 126);
  IF @RUN_DATE IS NULL SET @RUN_DATE = TRY_CONVERT(DATE, @PERIOD_RAW);
  IF @RUN_DATE IS NULL THROW 50000, 'Invalid period. Use YYYYMM or ISO date (YYYY-MM-DD).', 1;
  SET @UAR_PERIOD = LEFT(CONVERT(CHAR(8), @RUN_DATE, 112), 6);
END;

DECLARE @UAR_ID NVARCHAR(50) = CONCAT('UAR_', @UAR_PERIOD, '_', @APP_ID);

-- ==========================================================
-- 1) Sumber user SO dari AUTH_MAPPING yang terhubung ke EMP
--    (hanya employee dengan NOREG 'EMP%')
-- ==========================================================
IF OBJECT_ID('tempdb..#so_users') IS NOT NULL DROP TABLE #so_users;

SELECT
  @UAR_PERIOD AS UAR_PERIOD,
  @UAR_ID     AS UAR_ID,
  am.USERNAME,
  am.ROLE_ID,
  am.APPLICATION_ID,
  COALESCE(app.DIVISION_ID_OWNER, emp.DIVISION_ID) AS DIVISION_ID,
  emp.DEPARTMENT_ID AS DEPARTMENT_ID, 
  emp.NOREG,
  emp.PERSONNEL_NAME AS NAME,
  emp.POSITION_NAME,
  emp.SECTION_ID
INTO #so_users
FROM TB_M_AUTH_MAPPING am
JOIN TB_M_APPLICATION  app ON app.APPLICATION_ID = am.APPLICATION_ID
JOIN TB_M_EMPLOYEE     emp ON emp.NOREG = am.NOREG
WHERE am.APPLICATION_ID = @APP_ID
  AND emp.NOREG LIKE 'EMP%';

IF NOT EXISTS (SELECT 1 FROM #so_users)
BEGIN
  SELECT CAST(0 AS INT) AS inserted, CAST(0 AS INT) AS updated;
  RETURN;
END;

-- ==========================================================
-- 2) Tentukan So Head untuk UAR ini (prioritas POSITION_NAME mengandung 'So Head')
--    Ambil satu head (global untuk UAR ini) berdasarkan ranking.
--    Jika ingin per-division, hilangkan TOP(1) dan handle grouping di WF.
-- ==========================================================
IF OBJECT_ID('tempdb..#owner_groups') IS NOT NULL DROP TABLE #owner_groups;
SELECT DISTINCT DIVISION_ID, DEPARTMENT_ID INTO #owner_groups FROM #so_users;

IF OBJECT_ID('tempdb..#so_head_candidates') IS NOT NULL DROP TABLE #so_head_candidates;
SELECT
  e.DIVISION_ID,
  g.DEPARTMENT_ID,
  e.NOREG,
  e.PERSONNEL_NAME,
  e.POSITION_NAME,
  e.SECTION_ID,
  e.POSITION_LEVEL,
  CASE WHEN CHARINDEX('so head', LOWER(LTRIM(RTRIM(e.POSITION_NAME)))) > 0 THEN 0 ELSE 1 END AS is_head_first
INTO #so_head_candidates
FROM TB_M_EMPLOYEE e
JOIN #owner_groups g
  ON g.DIVISION_ID = e.DIVISION_ID
  AND ISNULL(g.DEPARTMENT_ID,'') = ISNULL(e.DEPARTMENT_ID,'')
WHERE e.NOREG LIKE 'EMP%';

IF OBJECT_ID('tempdb..#pick_so_head') IS NOT NULL DROP TABLE #pick_so_head;
;WITH ranked AS (
  SELECT
    c.*,
    ROW_NUMBER() OVER (
      PARTITION BY c.DIVISION_ID, c.DEPARTMENT_ID
      ORDER BY c.is_head_first, ISNULL(c.POSITION_LEVEL,0) DESC, c.NOREG
    ) AS rn
  FROM #so_head_candidates c
)
SELECT
  @UAR_ID AS UAR_ID,
  2 AS SEQ_NO,
  DIVISION_ID,
  DEPARTMENT_ID,
  NOREG          AS APPROVER_NOREG,
  PERSONNEL_NAME AS APPROVER_NAME
INTO #pick_so_head
FROM ranked
WHERE rn = 1;

-- Safety fallback: kalau candidate kosong (mustahil bila #so_users ada, tapi tetap jaga-jaga)
IF NOT EXISTS (SELECT 1 FROM #pick_so_head)
BEGIN
  INSERT INTO #pick_so_head (UAR_ID, SEQ_NO, DIVISION_ID, DEPARTMENT_ID, APPROVER_NOREG, APPROVER_NAME)
  SELECT TOP (1)
    @UAR_ID, 2, ou.DIVISION_ID, ou.DEPARTMENT_ID, ou.NOREG, ou.NAME
  FROM #so_users ou
  ORDER BY ou.NOREG; -- fallback sederhana
END;

-- ==========================================================
-- 3) MERGE Header WF SEQ=2 (System Owner)
--    ON hanya UAR_ID + SEQ_NO agar tidak terganjal DEPT_ID
-- ==========================================================
WITH so_head_with_plan AS (
  SELECT
    x.UAR_ID, x.SEQ_NO, x.DIVISION_ID, x.DEPARTMENT_ID,
    x.APPROVER_NOREG, x.APPROVER_NAME,
    cfg.VALUE_NUM AS OFFSET_DAYS,
    DATEADD(DAY, ISNULL(cfg.VALUE_NUM,0), CAST(SYSDATETIME() AS DATE)) AS PLAN_APPROVED_DT
  FROM (SELECT * FROM #pick_so_head) x
  OUTER APPLY (
    SELECT TOP 1 s.VALUE_NUM
    FROM TB_M_SYSTEM s
    WHERE s.SYSTEM_TYPE = 'UAR_PLAN'
      AND SYSDATETIME() BETWEEN s.VALID_FROM_DT AND ISNULL(s.VALID_TO_DT,'9999-12-31')
      AND (
           s.SYSTEM_CD = 'SO' OR
           s.SYSTEM_CD = 'DEFAULT'
      )
    ORDER BY
      CASE
        WHEN s.SYSTEM_CD = 'SO'                      THEN 1
        WHEN s.SYSTEM_CD = 'DEFAULT'                 THEN 2
        ELSE 99
      END
  ) cfg
)
MERGE TB_R_WORKFLOW WITH (HOLDLOCK) AS wf
USING so_head_with_plan x
  ON (wf.UAR_ID = x.UAR_ID AND wf.SEQ_NO = x.SEQ_NO AND ISNULL(wf.DIVISION_ID,'')   = ISNULL(x.DIVISION_ID,'') AND ISNULL(wf.DEPARTMENT_ID,'') = ISNULL(x.DEPARTMENT_ID,''))
WHEN NOT MATCHED THEN
  INSERT (UAR_ID, SEQ_NO, DIVISION_ID, DEPARTMENT_ID,
          APPROVAL_CD, APPROVAL_DESC,
          APPROVER_NOREG, APPROVER_NAME,
          PLAN_APPROVED_DT,
          CREATED_BY, CREATED_DT)
  VALUES (x.UAR_ID, x.SEQ_NO, x.DIVISION_ID, x.DEPARTMENT_ID,
          2, 'System Owner Approval',
          x.APPROVER_NOREG, x.APPROVER_NAME,
          x.PLAN_APPROVED_DT,
          ${p.createdBy}, SYSDATETIME())
WHEN MATCHED THEN
  UPDATE SET
    wf.DIVISION_ID    = x.DIVISION_ID,
    wf.DEPARTMENT_ID  = x.DEPARTMENT_ID,
    wf.APPROVER_NOREG = x.APPROVER_NOREG,
    wf.APPROVER_NAME  = x.APPROVER_NAME,
    wf.PLAN_APPROVED_DT  = x.PLAN_APPROVED_DT,
    wf.CHANGED_BY     = ${p.createdBy},
    wf.CHANGED_DT     = SYSDATETIME();

-- ==========================================================
-- 4) MERGE Detail TB_R_UAR_SYSTEM_OWNER
--    EXCLUDE head dari detail supaya tidak dobel
-- ==========================================================
DECLARE @chg TABLE (action NVARCHAR(10));

;WITH so_enriched AS (
  SELECT
    u.UAR_PERIOD,
    u.UAR_ID,
    u.USERNAME,
    u.ROLE_ID,
    u.APPLICATION_ID,
    u.DIVISION_ID,
    u.DEPARTMENT_ID,
    u.NOREG,
    u.NAME,
    u.POSITION_NAME,
    u.SECTION_ID,
    h.APPROVER_NOREG AS REVIEWER_NOREG,
    h.APPROVER_NAME  AS REVIEWER_NAME
  FROM #so_users u
  JOIN #pick_so_head h
    ON  h.DIVISION_ID              = u.DIVISION_ID
    AND ISNULL(h.DEPARTMENT_ID,'') = ISNULL(u.DEPARTMENT_ID,'')   -- [CHANGED]
  WHERE ISNULL(u.NOREG,'') <> ISNULL(h.APPROVER_NOREG,'')         -- exclude head dari detail
)
MERGE TB_R_UAR_SYSTEM_OWNER AS tgt
USING so_enriched AS src
  ON ( tgt.UAR_ID        = src.UAR_ID
       AND tgt.APPLICATION_ID = src.APPLICATION_ID
       AND tgt.USERNAME  = src.USERNAME
       AND tgt.ROLE_ID   = src.ROLE_ID )
WHEN NOT MATCHED THEN
  INSERT (
    UAR_PERIOD, UAR_ID, USERNAME, ROLE_ID, APPLICATION_ID,
    DIVISION_ID, DEPARTMENT_ID, NOREG, NAME, POSITION_NAME, SECTION_ID,
    REVIEW_STATUS, SO_APPROVAL_STATUS,
    REVIEWER_NOREG, REVIEWER_NAME,
    CREATED_BY, CREATED_DT
  )
  VALUES (
    src.UAR_PERIOD, src.UAR_ID, src.USERNAME, src.ROLE_ID, src.APPLICATION_ID,
    src.DIVISION_ID, src.DEPARTMENT_ID, src.NOREG, src.NAME, src.POSITION_NAME, src.SECTION_ID,
    NULL, NULL,
    src.REVIEWER_NOREG, src.REVIEWER_NAME,
    ${p.createdBy}, SYSDATETIME()
  )
WHEN MATCHED AND (
     ISNULL(tgt.DIVISION_ID   ,-1) <> ISNULL(src.DIVISION_ID   ,-1)
  OR ISNULL(tgt.DEPARTMENT_ID ,-1) <> ISNULL(src.DEPARTMENT_ID ,-1)
  OR ISNULL(tgt.NOREG         ,'') <> ISNULL(src.NOREG         ,'')
  OR ISNULL(tgt.NAME          ,'') <> ISNULL(src.NAME          ,'')
  OR ISNULL(tgt.POSITION_NAME ,'') <> ISNULL(src.POSITION_NAME ,'')
  OR ISNULL(tgt.SECTION_ID    ,-1) <> ISNULL(src.SECTION_ID    ,-1)
  OR ISNULL(tgt.REVIEWER_NOREG,'') <> ISNULL(src.REVIEWER_NOREG,'')
  OR ISNULL(tgt.REVIEWER_NAME ,'') <> ISNULL(src.REVIEWER_NAME ,'')
)
  THEN UPDATE SET
    tgt.DIVISION_ID     = src.DIVISION_ID,
    tgt.DEPARTMENT_ID   = src.DEPARTMENT_ID,
    tgt.NOREG           = src.NOREG,
    tgt.NAME            = src.NAME,
    tgt.POSITION_NAME   = src.POSITION_NAME,
    tgt.SECTION_ID      = src.SECTION_ID,
    tgt.REVIEWER_NOREG  = COALESCE(src.REVIEWER_NOREG, tgt.REVIEWER_NOREG),
    tgt.REVIEWER_NAME   = COALESCE(src.REVIEWER_NAME , tgt.REVIEWER_NAME ),
    tgt.CHANGED_BY      = ${p.createdBy},
    tgt.CHANGED_DT      = SYSDATETIME()
OUTPUT $action INTO @chg;

-- Cleanup
DROP TABLE IF EXISTS #so_users;
DROP TABLE IF EXISTS #owner_groups;
DROP TABLE IF EXISTS #so_head_candidates;
DROP TABLE IF EXISTS #pick_so_head;

-- Hasil
SELECT
  SUM(CASE WHEN action='INSERT' THEN 1 ELSE 0 END) AS inserted,
  SUM(CASE WHEN action='UPDATE' THEN 1 ELSE 0 END) AS updated
FROM @chg;`;

  return rows?.[0] ?? { inserted: 0, updated: 0 };
}




export const uarGenerateRepository = {
  async generateAll(p: GenParams) {
    return prisma.$transaction(async (tx) => {
      const divisionUser = await mergeDivisionUserTx(tx, p);
      const systemOwner = await mergeSystemOwnerTx(tx, p);
      return { divisionUser, systemOwner };
    });
  },
};
