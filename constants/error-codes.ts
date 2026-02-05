/**
 * Centralized error codes for the application
 */

export const ERROR_CODES = {
    VALIDATION: "VALIDATION_ERROR",
    NOT_FOUND: "NOT_FOUND",
    DATABASE: "DATABASE_ERROR",
    UNAUTHORIZED: "UNAUTHORIZED",
    SERVER_ERROR: "SERVER_ERROR",
    EMAIL_SEND_FAILED: "EMAIL_SEND_FAILED",
  } as const;
  
  export type TErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
  