// import { env } from '@/common/utils/envConfig';
// import { logger } from '@/server';
// import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import Axios from 'axios';
import https from 'https';
import { z } from 'zod';
import { env } from '../../config/env';
// extendZodWithOpenApi(z);
export const userSchema = z.object({
    username: z.string(),
    password: z.string(),
});
export const menuSchema = z.array(z.object({
    menuId: z.string(),
    menuText: z.string(),
    menuTips: z.string(),
    isActive: z.string(),
    visibility: z.string(),
    url: z.string(),
    glyph: z.string(),
    separator: z.string(),
    target: z.string().nullable(),
    submenu: z
        .array(z.object({
        menuId: z.string(),
        menuText: z.string(),
        menuTips: z.string(),
        isActive: z.string(),
        visibility: z.string(),
        url: z.string(),
        glyph: z.string(),
        separator: z.string(),
        target: z.string().nullable(),
    }))
        .optional(),
}));
export const employeeSchema = z.object({
    NOREG: z.string(),
    NAME: z.string(),
    CLASS: z.string(),
    POSITION: z.string(),
    STATUS: z.string(),
    DIRECTORATE: z.string(),
    DIVISION: z.string(),
    DEPARTMENT: z.string(),
    SECTION: z.string(),
    LINE: z.string().optional(),
    GROUP: z.string().optional(),
    UNIT_CODE: z.string(),
    MAIN_LOCATION: z.string(),
    SUB_LOCATION: z.string(),
    EMAIL: z.string().email(),
    PHONE_EXT: z.string(),
    GENDER_DESC: z.string(),
});
export const superiorSchema = z.object({
    NGH: z.string().nullable(),
    NGH_NAME: z.string().nullable(),
    NLH: z.string().nullable(),
    NLH_NAME: z.string().nullable(),
    NSH: z.string().nullable(),
    NSH_NAME: z.string().nullable(),
    NDPH: z.string().nullable(),
    NDPH_NAME: z.string().nullable(),
    NDH: z.string().nullable(),
    NDH_NAME: z.string().nullable(),
    NDIR: z.string().nullable(),
    NDIR_NAME: z.string().nullable(),
});
export const gadUserSchema = z.object({
    MAIL: z.string().email(),
    NOREG: z.string(),
    PERSONNEL_NAME: z.string(),
    POSITION_NAME: z.string(),
    CLASS: z.string(),
    POSITION_CODE: z.number().int(),
    POSITION_TITLE: z.string(),
    POSITION_LEVEL: z.number().int(),
    JOB_CODE: z.number().int(),
    JOB_TITLE: z.string(),
    DIRECTORATE_ID: z.number().int(),
    DIRECTORATE_NAME: z.string(),
    DIVISION_ID: z.number().int(),
    DIVISION_NAME: z.string(),
    DEPARTMENT_ID: z.number().int(),
    DEPARTMENT_NAME: z.string(),
    SECTION_ID: z.number().int(),
    SECTION_NAME: z.string(),
    LINE_ID: z.number().nullable(),
    LINE_NAME: z.string().nullable(),
    GROUP_ID: z.number().nullable(),
    GROUP_NAME: z.string().nullable(),
    ORG_ID: z.number().int(),
    ORG_TITLE: z.string(),
    ORG_LEVEL_ID: z.number().int(),
    USERNAME: z.string().nullable(),
    VALID_FROM: z.string(),
    VALID_TO: z.string(),
    DELIMIT_DATE: z.string().nullable(),
});
// Input Validation for 'GET users/:id' endpoint
export const getByNoreg = z.object({
    params: z.object({ NOREG: z.string() }),
});
export const LoginReqSchema = z.object({
    body: userSchema,
});
export const GetSuperiorResponse = z.object({
    body: z.array(z.object(superiorSchema.shape)),
});
export const GetGADResponse = z.object({
    body: z.array(z.object(gadUserSchema.shape)),
});
export const roleSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
});
export const companyInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    address: z.string().nullable(),
    picName: z.string().nullable(),
    phoneNumber: z.string().nullable(),
    officeNumber: z.string().nullable(),
});
export const areaInfoSchema = z.object({
    id: z.string(),
    description: z.string().nullable(),
    name: z.string().nullable(),
});
export const divisionInfoSchema = z.object({
    id: z.string(),
    description: z.string().nullable(),
    name: z.string().nullable(),
});
export const profileResponseSchema = z.object({
    user: z.object({
        username: z.string(),
        name: z.string(),
        id: z.string(),
        regNo: z.string(),
        company: z.string().nullable(),
        firstName: z.string(),
        lastName: z.string().nullable(),
        gender: z.string(),
        birthDate: z.string().nullable(),
        address: z.string().nullable(),
        companyInfo: companyInfoSchema.nullable(),
        area: areaInfoSchema.nullable(),
        division: divisionInfoSchema.nullable(),
    }),
    features: z.array(z.string()),
    functions: z.array(z.string()),
    roles: z.array(z.string()),
});
export const GetProfileResponse = z.object({
    body: profileResponseSchema,
});
export class HRPortalClient {
    api;
    constructor() {
        this.api = Axios.create({
            baseURL: env.HRPORTAL_API,
            auth: {
                username: env.HRPORTAL_USER,
                password: env.HRPORTAL_PASS,
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
            timeout: 10000, // 10 second timeout
        });
    }
    // Helper method to convert object to URL-encoded string
    urlEncode(data) {
        return Object.keys(data)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
    }
    /**
     * Authenticate user credentials against HR Portal API
     * @param username - User's username
     * @param password - User's password
     * @returns Promise<HRPortalAuthResponse> - Authentication result
     */
    async checkSCMobile(username, password) {
        try {
            //   logger.info(`Attempting HR Portal authentication for user: ${username}`);
            const authData = {
                mobileno: '0',
                username: username,
                password: password,
            };
            const response = await this.api.post('/Login/CheckSCMobile', this.urlEncode(authData));
            // Log successful authentication
            //   logger.info(`HR Portal authentication successful for user: ${username}`);
            return {
                success: true,
                message: 'Authentication successful',
            };
        }
        catch (error) {
            const axiosError = error;
            // Log authentication failure
            //   logger.error(`HR Portal authentication failed for user: ${username}`);
            //   logger.error({
            //     status: axiosError.response?.status,
            //     statusText: axiosError.response?.statusText,
            //     data: axiosError.response?.data,
            //     message: axiosError.message,
            //   });
            // Handle different types of errors
            if (axiosError.response) {
                // Server responded with error status
                const status = axiosError.response.status;
                if (status === 401 || status === 403) {
                    return {
                        success: false,
                        message: 'Invalid credentials',
                    };
                }
                else if (status >= 500) {
                    return {
                        success: false,
                        message: 'HR Portal service unavailable',
                    };
                }
                else {
                    return {
                        success: false,
                        message: 'Authentication failed',
                    };
                }
            }
            else if (axiosError.request) {
                // Network error - no response received
                return {
                    success: false,
                    message: 'HR Portal service unavailable',
                };
            }
            else {
                // Other error
                return {
                    success: false,
                    message: 'Authentication failed',
                };
            }
        }
    }
}
export const hrPortalClient = new HRPortalClient();
