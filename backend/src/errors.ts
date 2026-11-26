import { ERROR_CODES, type ErrorCode } from '@mrrokesh/shared';

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, details?: unknown) {
    super(ERROR_CODES[code].message);
    this.name = 'ApiError';
    this.code = code;
    const definition = ERROR_CODES[code];
    this.statusCode = 'http' in definition ? definition.http : 500;
    this.details = details;
  }
}

export class BadJsonError extends Error {
  constructor() {
    super('Invalid JSON');
    this.name = 'BadJsonError';
  }
}
