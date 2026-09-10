export class EngineError extends Error {
  readonly code: string;
  readonly details?: string[];

  constructor(code: string, message: string, details?: string[]) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.details = details;
  }
}
