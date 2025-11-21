import axios, { AxiosError, AxiosInstance } from 'axios';
import https from 'https';
import { env } from '../../config/env';
// HR Portal Authentication Models and Client
export interface HRPortalAuthResponse {
  success: boolean;
  data: {
    status: boolean;
    data: any | null;
    message: {
      ID?: string;
      EN?: string;
    };
  };
}

export class HRPortalClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
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
  private urlEncode(data: Record<string, string>): string {
    return Object.keys(data)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`,
      )
      .join('&');
  }

  /**
   * Authenticate user credentials against HR Portal API
   * @param username - User's username
   * @param password - User's password
   * @returns Promise<HRPortalAuthResponse> - Authentication result
   */
  async checkSCMobile(
    username: string,
    password: string,
  ): Promise<HRPortalAuthResponse> {
    try {
      console.log(`Attempting HR Portal authentication for user: ${username}`);

      const authData = {
        mobileno: '0',
        username: username.trim(),
        password,
      };

      const response = await this.api.post(
        '/Login/CheckSCMobile',
        this.urlEncode(authData),
      );

      console.log(response)

      if (response.status === 200) {
        const apiResponse = response.data as {
          status: boolean;
          data: any | null;
          message: { ID?: string; EN?: string };
        };

        const success = !!(apiResponse.status && apiResponse.data);

        if (success) {
          console.log(
            `HR Portal authentication successful for user: ${username}`,
          );
        } else {
          console.log(
            `HR Portal authentication failed for user: ${username} - ${apiResponse.message?.EN || 'Unknown error'
            }`,
          );
        }
        console.log("responnya", apiResponse.data)

        return {
          success,
          data: {
            status: apiResponse.status ?? false,
            data: apiResponse.data ?? null,
            message: apiResponse.message ?? { ID: '', EN: '' },
          },
        };
      }

      // fallback non-200
      return {
        success: false,
        data: {
          status: false,
          data: null,
          message: {
            ID: 'Unexpected response from HR Portal',
            EN: 'Unexpected response from HR Portal',
          },
        },
      };
    } catch (error) {
      // ... (bagian catch-mu tetap, tapi tambahkan success: false di return)
      return {
        success: false,
        data: {
          status: false,
          data: null,
          message: {
            ID: 'Authentication failed',
            EN: 'Authentication failed',
          },
        },
      };
    }
  }

}

export const hrPortalClient = new HRPortalClient();
