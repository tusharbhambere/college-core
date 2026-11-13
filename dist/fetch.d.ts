/**
 * Wraps fetch so simultaneous identical GETs share one network request.
 * Mutations, and reads issued after the shared request settles, always reach the network.
 */
export declare function createDedupedFetch(fetcher?: typeof globalThis.fetch): typeof globalThis.fetch;
//# sourceMappingURL=fetch.d.ts.map