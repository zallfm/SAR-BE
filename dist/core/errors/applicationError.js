export class ApplicationError extends Error {
    code;
    details;
    requestId;
    statusCode;
    constructor(code, message, details, requestId, statusCode = 400) {
        super(message);
        this.code = code;
        this.details = details;
        this.requestId = requestId;
        this.statusCode = statusCode;
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
