export interface Schedule {
  APPLICATION_ID: string;
  SCHEDULE_SYNC_START_DT: string;
  SCHEDULE_SYNC_END_DT: string;
  SCHEDULE_UAR_DT: string;
  SCHEDULE_STATUS: string;
  CREATED_BY: string;
  CREATED_DT: string;
  CHANGED_BY: string | null;
  CHANGED_DT: string | null;
}
