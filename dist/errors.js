/** Transport, backend-declared, and contract errors share one inspectable type. */
export class CollegeApiError extends Error {
    kind;
    details;
    name = 'CollegeApiError';
    constructor(kind, message, details = {}) {
        super(message, details.cause === undefined ? undefined : { cause: details.cause });
        this.kind = kind;
        this.details = details;
    }
}
/** Returns a non-empty backend message; call only after determining the response failed. */
export function getApiResponseMessage(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
        return undefined;
    const message = payload.message;
    return typeof message === 'string' && message.trim() ? message.trim() : undefined;
}
/** Preserves the backend message for users and the contract failure for diagnostics. */
export function invalidApiResponse(reason, response, path) {
    return new CollegeApiError('response', getApiResponseMessage(response) ?? reason, { path, response, reason });
}
export function isId(value) { return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value); }
export function requireId(value, label = 'id') {
    if (!isId(value))
        throw new CollegeApiError('input', `${label} must be a 24-character hexadecimal ObjectId.`);
    return value;
}
//# sourceMappingURL=errors.js.map