/**
 * Result pattern types for robust error handling
 */

export type AppErrorObject = {
    code: string;
    message: string;
    statusCode?: number;
    details?: unknown;
  };
  
  export type Result<T, E = AppErrorObject> =
    | { ok: true; data: T }
    | { ok: false; error: E };
  
  export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });
  
  export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
  
  export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; data: T } =>
    r.ok === true;
  
  export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } =>
    r.ok === false;
  