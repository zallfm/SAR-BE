import type { LogEntry, LogDetail } from '../../types/log_monitoring';

// ---- Mock headline logs (ringkasan) ----
export const mockLogs: LogEntry[] = [
    // Security
    {
        NO: 17,
        PROCESS_ID: '2025011600017',
        USER_ID: 'admin',
        MODULE: 'Security',
        FUNCTION_NAME: 'Login Success',
        START_DATE: '21-07-2024 16:30:00',
        END_DATE: '21-07-2024 16:30:00',
        STATUS: 'Success',
        DETAILS: 'User admin successfully logged in from IP: 192.168.1.100'
    },
    {
        NO: 16,
        PROCESS_ID: '2025011600016',
        USER_ID: 'unknown',
        MODULE: 'Security',
        FUNCTION_NAME: 'Login Failed',
        START_DATE: '21-07-2024 16:25:00',
        END_DATE: '21-07-2024 16:25:00',
        STATUS: 'Error',
        DETAILS: 'Failed login attempt for username: testuser (attempt #3) - Potential brute force attack'
    },

    // InProgress
    {
        NO: 15,
        PROCESS_ID: '2025011600015',
        USER_ID: 'systemowner',
        MODULE: 'UAR',
        FUNCTION_NAME: 'Update',
        START_DATE: '21-07-2024 16:00:00',
        END_DATE: '21-07-2024 16:00:00',
        STATUS: 'InProgress',
        DETAILS: 'Updating UAR progress for Division: Production Planning Control'
    },

    // Errors
    {
        NO: 14,
        PROCESS_ID: '2025011600014',
        USER_ID: 'dph',
        MODULE: 'Application',
        FUNCTION_NAME: 'Update',
        START_DATE: '21-07-2024 15:15:00',
        END_DATE: '21-07-2024 15:15:01',
        STATUS: 'Error',
        DETAILS: 'Failed to update application: Database connection timeout'
    },
    {
        NO: 13,
        PROCESS_ID: '2025011600013',
        USER_ID: 'admin',
        MODULE: 'UAR',
        FUNCTION_NAME: 'Create',
        START_DATE: '21-07-2024 15:00:00',
        END_DATE: '21-07-2024 15:00:02',
        STATUS: 'Error',
        DETAILS: 'Failed to create UAR record: Validation error - Invalid division code'
    },

    // Schedule
    {
        NO: 12,
        PROCESS_ID: '2025011600012',
        USER_ID: 'systemowner',
        MODULE: 'Schedule',
        FUNCTION_NAME: 'Update',
        START_DATE: '21-07-2024 14:15:00',
        END_DATE: '21-07-2024 14:15:04',
        STATUS: 'Success',
        DETAILS: 'Updated schedule: UAR Review Schedule for Q2 2025'
    },
    {
        NO: 11,
        PROCESS_ID: '2025011600011',
        USER_ID: 'admin',
        MODULE: 'Schedule',
        FUNCTION_NAME: 'Create',
        START_DATE: '21-07-2024 14:00:00',
        END_DATE: '21-07-2024 14:00:05',
        STATUS: 'Success', 
        DETAILS: 'Created new schedule: UAR Review Schedule for Q1 2025'
    },

    // User
    {
        NO: 10, 
        PROCESS_ID: '2025011600010', 
        USER_ID: 'dph', 
        MODULE: 'User',
        FUNCTION_NAME: 'Update', 
        START_DATE: '21-07-2024 13:15:00', 
        END_DATE: '21-07-2024 13:15:03',
        STATUS: 'Success', 
        DETAILS: 'Updated user permissions: UAR PIC for Division: Production Engineering'
    },
    {
        NO: 9, 
        PROCESS_ID: '2025011600009', 
        USER_ID: 'admin', 
        MODULE: 'User',
        FUNCTION_NAME: 'Create', 
        START_DATE: '21-07-2024 13:00:00', 
        END_DATE: '21-07-2024 13:00:07',
        STATUS: 'Success', 
        DETAILS: 'Created new user: UAR PIC for Division: Production Planning Control'
    },

    // System Master
    {
        NO: 8, PROCESS_ID: '2025011600008', 
        USER_ID: 'admin', 
        MODULE: 'System Master',
        FUNCTION_NAME: 'Update', 
        START_DATE: '21-07-2024 12:15:00', 
        END_DATE: '21-07-2024 12:15:04',
        STATUS: 'Success', 
        DETAILS: 'Updated system master: Security Center Configuration'
    },
    {
        NO: 7, 
        PROCESS_ID: '2025011600007', 
        USER_ID: 'systemowner', 
        MODULE: 'System Master',
        FUNCTION_NAME: 'Create', 
        START_DATE: '21-07-2024 12:00:00', 
        END_DATE: '21-07-2024 12:00:06',
        STATUS: 'Success', 
        DETAILS: 'Created new system master record: LDAP Configuration'
    },

    // Application
    {
        NO: 6, 
        PROCESS_ID: '2025011600006', 
        USER_ID: 'admin', 
        MODULE: 'Application',
        FUNCTION_NAME: 'Update', 
        START_DATE: '21-07-2024 11:30:00', 
        END_DATE: '21-07-2024 11:30:03',
        STATUS: 'Warning', 
        DETAILS: 'Updated application status: Toyota Management System to Inactive'
    },
    {
        NO: 5, 
        PROCESS_ID: '2025011600005', 
        USER_ID: 'dph', 
        MODULE: 'Application',
        FUNCTION_NAME: 'Update', 
        START_DATE: '21-07-2024 11:15:00', 
        END_DATE: '21-07-2024 11:15:05',
        STATUS: 'Success', 
        DETAILS: 'Updated application: Production Achievement System'
    },
    {
        NO: 4, 
        PROCESS_ID: '2025011600004', 
        USER_ID: 'admin', 
        MODULE: 'Application',
        FUNCTION_NAME: 'Create', 
        START_DATE: '21-07-2024 11:00:00', 
        END_DATE: '21-07-2024 11:00:08',
        STATUS: 'Success', 
        DETAILS: 'Created new application: Integrated Production Planning Control System'
    },

    // UAR (oldest)
    {
        NO: 3, 
        PROCESS_ID: '2025011600003', 
        USER_ID: 'systemowner', 
        MODULE: 'UAR',
        FUNCTION_NAME: 'Delete', 
        START_DATE: '21-07-2024 10:30:00', 
        END_DATE: '21-07-2024 10:30:02',
        STATUS: 'Success', 
        DETAILS: 'Deleted UAR record for Division: Corporate Planning'
    },
    {
        NO: 2, 
        PROCESS_ID: '2025011600002', 
        USER_ID: 'dph', 
        MODULE: 'UAR',
        FUNCTION_NAME: 'Update', 
        START_DATE: '21-07-2024 10:15:00', 
        END_DATE: '21-07-2024 10:15:03',
        STATUS: 'Success', 
        DETAILS: 'Updated UAR progress for Division: Production Engineering'
    },
    {
        NO: 1, 
        PROCESS_ID: '2025011600001', 
        USER_ID: 'admin', 
        MODULE: 'UAR',
        FUNCTION_NAME: 'Create', 
        START_DATE: '21-07-2024 10:00:00', 
        END_DATE: '21-07-2024 10:00:05',
        STATUS: 'Success', 
        DETAILS: 'Created new UAR record for Division: Production Planning Control'
    }
];

// ---- Mock details: 10 langkah per PROCESS_ID (contoh) ----
const mkDetails = (processId: string, base = '21-07-2024 10:00:00'): LogDetail[] => {
    return Array.from({ length: 10 }, (_, i) => ({
        ID: i + 1,
        PROCESS_ID: processId,
        MESSAGE_DATE_TIME: base, // untuk mock: sama; real-nya bisa dihitung per-step
        LOCATION: `Module.FunctionName.Step${i + 1}`,
        MESSAGE_DETAIL: `Execution step ${i + 1} completed.${(i + 1) % 4 === 0 ? ' Encountered a minor warning.' : ''}`
    }));
};

export const mockLogDetails: LogDetail[] = mockLogs.flatMap(l => mkDetails(l.PROCESS_ID, l.START_DATE));
