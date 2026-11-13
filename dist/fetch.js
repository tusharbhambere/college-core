/**
 * Wraps fetch so simultaneous identical GETs share one network request.
 * Mutations, and reads issued after the shared request settles, always reach the network.
 */
export function createDedupedFetch(fetcher = globalThis.fetch) {
    const pending = new Map();
    return async (input, init) => {
        if ((init?.method ?? 'GET').toUpperCase() !== 'GET')
            return fetcher(input, init);
        const key = String(input instanceof Request ? input.url : input);
        let request = pending.get(key);
        if (!request) {
            const created = fetcher(input, init);
            request = created;
            pending.set(key, created);
            const clear = () => { if (pending.get(key) === created)
                pending.delete(key); };
            created.then(clear, clear);
        }
        return (await request).clone();
    };
}
//# sourceMappingURL=fetch.js.map