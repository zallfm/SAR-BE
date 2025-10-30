export interface MasterSystem {
  SYSTEM_TYPE: string;
  SYSTEM_CD: string;
  VALID_FROM_DT: string;
  VALID_TO_DT: string;
  NEW_VALID_FROM_DT: string | null;
  VALUE_TEXT: string | null;
  VALUE_NUM: number | null;
  VALUE_TIME: string | null;
  CREATED_BY: string;
  CREATED_DT: string;
  CHANGED_BY: string | null;
  CHANGED_DT: string | null;
}
