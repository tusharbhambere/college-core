export type CollegeApiErrorKind = 'input' | 'http' | 'network' | 'timeout' | 'aborted' | 'json' | 'api' | 'response' | 'tenant';
/** Transport, backend-declared, and contract errors share one inspectable type. */
export declare class CollegeApiError extends Error {
    readonly kind: CollegeApiErrorKind;
    readonly details: {
        path?: string;
        status?: number;
        response?: unknown;
        reason?: string;
        cause?: unknown;
    };
    readonly name = "CollegeApiError";
    constructor(kind: CollegeApiErrorKind, message: string, details?: {
        path?: string;
        status?: number;
        response?: unknown;
        reason?: string;
        cause?: unknown;
    });
}
/** Returns a non-empty backend message; call only after determining the response failed. */
export declare function getApiResponseMessage(payload: unknown): string | undefined;
/** Preserves the backend message for users and the contract failure for diagnostics. */
export declare function invalidApiResponse(reason: string, response: unknown, path?: string): CollegeApiError;
export declare function isId(value: unknown): value is string;
export declare function requireId(value: unknown, label?: string): string;
//# sourceMappingURL=errors.d.ts.map