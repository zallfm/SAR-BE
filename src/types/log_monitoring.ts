export interface LogEntry {
  NO: number;
  PROCESS_ID: string;
  USER_ID: string;
  MODULE: string;
  FUNCTION_NAME: string;
  START_DATE: string;
  END_DATE: string;
  STATUS: 'Success' | 'Error' | 'Warning' | 'InProgress';
  DETAILS: LogDetail[];
}

// types/log-monitoring.ts
export type ListLogsQuery = {
  page?: number;
  limit?: number;
  status?: any;
  module?: string;
  q?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: any;
  order?: any;
};
export interface LogDetail {
  ID: number;
  PROCESS_ID: string;
  MESSAGE_DATE_TIME: string;
  LOCATION: string;
  MESSAGE_DETAIL: string;
}
