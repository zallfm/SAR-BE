import type { ErrorCode } from './errorCodes.js';

export class ApplicationError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown,
    public requestId?: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ApplicationError';
  }

  toResponse() {
    return {
      code: this.code,
      message: this.message,
      requestId: this.requestId,
      ...(this.details ? { details: this.details } : {})
    };
  }
}
