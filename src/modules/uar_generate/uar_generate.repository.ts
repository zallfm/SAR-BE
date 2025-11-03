import { prisma } from "../../db/prisma";

type TxLike = { $queryRaw<T = unknown>(...args: any[]): Promise<T> };

type MergeCount = { inserted: number; updated: number };
// type GenParams = { period: string; };
type GenParams = { period: string; application_id: string; createdBy: string };
// DEPARTMENT_ID
async function mergeDivisionUserTx(tx: TxLike, p: GenParams): Promise<MergeCount> {
  const rows = await tx.$queryRaw<{ inserted: number; updated: number }[]>`
DECLARE @PERIOD_RAW NVARCHAR(30) = ${p.period};
DECLARE @APP_ID NVARCHAR(30) = ${p.application_id};
DECLARE @CREATED_BY VARCHAR(50)  = ${p.createdBy};

-- Normalisasi UAR_PERIOD => YYYYMM
DECLARE @UAR_PERIOD CHAR(6);
IF @PERIOD_RAW LIKE '[0-9][0-9][0-9][0-9][0-9][0-9]'        -- 'YYYYMM'
BEGIN
  SET @UAR_PERIOD = @PERIOD_RAW;
END
ELSE
BEGIN
  DECLARE @RUN_DATE DATE = TRY_CONVERT(DATE, @PERIOD_RAW, 126);
  IF @RUN_DATE IS NULL SET @RUN_DATE = TRY_CONVERT(DATE, @PERIOD_RAW);
  IF @RUN_DATE IS NULL THROW 50000, 'Invalid period. Use YYYYMM or ISO date (YYYY-MM-DD).', 1;
  SET @UAR_PERIOD = LEFT(CONVERT(CHAR(8), @RUN_DATE, 112), 6); -- 'YYYYMM'
END

-- yyMM untuk UAR_ID
DECLARE @UYM CHAR(4) = RIGHT(@UAR_PERIOD, 4);
DECLARE @chg TABLE (action NVARCHAR(10));

WITH src AS (
  SELECT
    @UAR_PERIOD AS UAR_PERIOD,
    CONCAT('UAR_', @UYM, '_', am.APPLICATION_ID) AS UAR_ID,
    am.USERNAME,
    am.ROLE_ID,
    am.APPLICATION_ID,
    app.DIVISION_ID_OWNER AS DIVISION_ID,
    app.DIVISION_ID_OWNER AS DEPARTMENT_ID,
    am.NOREG,
    LTRIM(RTRIM(CONCAT(COALESCE(am.FIRST_NAME,''),' ',COALESCE(am.LAST_NAME,'')))) AS NAME
  FROM TB_M_AUTH_MAPPING am
  JOIN TB_M_APPLICATION  app ON app.APPLICATION_ID = am.APPLICATION_ID
  WHERE am.APPLICATION_ID = @APP_ID
)
MERGE TB_R_UAR_DIVISION_USER AS tgt
USING src
ON (
  tgt.UAR_PERIOD = src.UAR_PERIOD
  AND tgt.APPLICATION_ID = src.APPLICATION_ID
  AND tgt.USERNAME = src.USERNAME
  AND tgt.ROLE_ID = src.ROLE_ID
)
WHEN NOT MATCHED THEN
  INSERT (
    UAR_PERIOD, UAR_ID, USERNAME, ROLE_ID, APPLICATION_ID,
    DIVISION_ID, DEPARTMENT_ID, NOREG, NAME,
    REVIEW_STATUS, DIV_APPROVAL_STATUS, SO_APPROVAL_STATUS,
    CREATED_BY, CREATED_DT
  )
  VALUES (
    src.UAR_PERIOD, src.UAR_ID, src.USERNAME, src.ROLE_ID, src.APPLICATION_ID,
    src.DIVISION_ID, src.DEPARTMENT_ID, src.NOREG, src.NAME,
    '0','0','0',
    @CREATED_BY, GETDATE()
  )
WHEN MATCHED THEN
  UPDATE SET
    tgt.UAR_ID        = src.UAR_ID,
    tgt.DIVISION_ID   = src.DIVISION_ID,
    tgt.DEPARTMENT_ID = COALESCE(tgt.DEPARTMENT_ID, src.DEPARTMENT_ID),
    tgt.NAME          = src.NAME,
    tgt.CHANGED_BY    = @CREATED_BY,
    tgt.CHANGED_DT    = GETDATE()
OUTPUT $action INTO @chg;

SELECT
  SUM(CASE WHEN action='INSERT' THEN 1 ELSE 0 END) AS inserted,
  SUM(CASE WHEN action='UPDATE' THEN 1 ELSE 0 END) AS updated
FROM @chg;`;
  return rows?.[0] ?? { inserted: 0, updated: 0 };
}

async function mergeSystemOwnerTx(tx: TxLike, p: GenParams): Promise<MergeCount> {
  const rows = await tx.$queryRaw<{ inserted: number; updated: number }[]>`
DECLARE @PERIOD_RAW NVARCHAR(30) = ${p.period};
DECLARE @CREATED_BY VARCHAR(50)  = ${p.createdBy};
DECLARE @APP_ID     NVARCHAR(50) = ${p.application_id};

-- Normalisasi UAR_PERIOD => YYYYMM
DECLARE @UAR_PERIOD CHAR(6);
IF @PERIOD_RAW LIKE '[0-9][0-9][0-9][0-9][0-9][0-9]'        -- 'YYYYMM'
BEGIN
  SET @UAR_PERIOD = @PERIOD_RAW;
END
ELSE
BEGIN
  DECLARE @RUN_DATE DATE = TRY_CONVERT(DATE, @PERIOD_RAW, 126);
  IF @RUN_DATE IS NULL SET @RUN_DATE = TRY_CONVERT(DATE, @PERIOD_RAW);
  IF @RUN_DATE IS NULL THROW 50000, 'Invalid period. Use YYYYMM or ISO date (YYYY-MM-DD).', 1;
  SET @UAR_PERIOD = LEFT(CONVERT(CHAR(8), @RUN_DATE, 112), 6); -- 'YYYYMM'
END

-- yyMM untuk UAR_ID
DECLARE @UYM CHAR(4) = RIGHT(@UAR_PERIOD, 4);
DECLARE @chg TABLE (action NVARCHAR(10));

WITH src AS (
  SELECT
    @UAR_PERIOD AS UAR_PERIOD,
    CONCAT('UAR_', @UYM, '_', am.APPLICATION_ID) AS UAR_ID,
    am.USERNAME,
    am.ROLE_ID,
    am.APPLICATION_ID,
    app.DIVISION_ID_OWNER AS DIVISION_ID,
    app.DIVISION_ID_OWNER AS DEPARTMENT_ID,
    am.NOREG,
    LTRIM(RTRIM(CONCAT(COALESCE(am.FIRST_NAME,''),' ',COALESCE(am.LAST_NAME,'')))) AS NAME,
    am.COMPANY_CD,
    app.NOREG_SYSTEM_OWNER AS REVIEWER_NOREG
  FROM TB_M_AUTH_MAPPING am
  JOIN TB_M_APPLICATION  app ON app.APPLICATION_ID = am.APPLICATION_ID
  WHERE am.APPLICATION_ID = @APP_ID
)
MERGE TB_R_UAR_SYSTEM_OWNER AS tgt
USING src
ON (
  tgt.UAR_PERIOD = src.UAR_PERIOD
  AND tgt.APPLICATION_ID = src.APPLICATION_ID
  AND tgt.USERNAME = src.USERNAME
  AND tgt.ROLE_ID = src.ROLE_ID
)
WHEN NOT MATCHED THEN
  INSERT (
    UAR_PERIOD, UAR_ID, USERNAME, ROLE_ID, APPLICATION_ID,
    DIVISION_ID, DEPARTMENT_ID,NOREG, NAME, COMPANY_CD,
    REVIEWER_NOREG, REVIEW_STATUS, SO_APPROVAL_STATUS,
    CREATED_BY, CREATED_DT
  )
  VALUES (
    src.UAR_PERIOD, src.UAR_ID, src.USERNAME, src.ROLE_ID, src.APPLICATION_ID,src.DIVISION_ID, src.DEPARTMENT_ID,
    src.NOREG, src.NAME, src.COMPANY_CD,
    src.REVIEWER_NOREG, '0', '0',
    @CREATED_BY, GETDATE()
  )
WHEN MATCHED THEN
  UPDATE SET
    tgt.UAR_ID         = src.UAR_ID,
    tgt.DIVISION_ID   = src.DIVISION_ID,
    tgt.DEPARTMENT_ID = COALESCE(tgt.DEPARTMENT_ID, src.DEPARTMENT_ID),
    tgt.NAME           = src.NAME,
    tgt.COMPANY_CD     = src.COMPANY_CD,
    tgt.REVIEWER_NOREG = src.REVIEWER_NOREG,
    tgt.CHANGED_BY     = @CREATED_BY,
    tgt.CHANGED_DT     = GETDATE()
OUTPUT $action INTO @chg;

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
