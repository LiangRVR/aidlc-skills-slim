export class EngineError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = 'EngineError';
        this.code = code;
        this.details = details;
    }
}
