export type CollegeApiErrorKind = 'input' | 'http' | 'network' | 'timeout' | 'aborted' | 'json' | 'api' | 'response' | 'tenant';
/** Transport, backend-declared, and contract errors share one inspectable type. */
export class CollegeApiError extends Error {
  readonly name = 'CollegeApiError';
  constructor(readonly kind: CollegeApiErrorKind, message: string, readonly details: { path?: string; status?: number; response?: unknown; reason?: string; cause?: unknown } = {}) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
  }
}
/** Returns a non-empty backend message; call only after determining the response failed. */
export function getApiResponseMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const message = (payload as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message.trim() : undefined;
}

/** Preserves the backend message for users and the contract failure for diagnostics. */
export function invalidApiResponse(reason: string, response: unknown, path?: string): CollegeApiError {
  return new CollegeApiError('response', getApiResponseMessage(response) ?? reason, { path, response, reason });
}
export function isId(value: unknown): value is string { return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value); }
export function requireId(value: unknown, label = 'id'): string {
  if (!isId(value)) throw new CollegeApiError('input', `${label} must be a 24-character hexadecimal ObjectId.`);
  return value;
}
