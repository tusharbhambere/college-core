/** Loading skeleton in the Gosavi card style (HPTRYK QLoader equivalent). */
export declare function LiveLoading({ rows }: {
    rows?: number;
}): import("react").JSX.Element;
/** A failed request — kept visually distinct from an empty result. */
export declare function LiveError({ error, onRetry, title }: {
    error: unknown;
    onRetry?: () => void;
    title?: string;
}): import("react").JSX.Element;
export declare function LiveEmpty({ children, actions }: {
    children?: React.ReactNode;
    actions?: boolean;
}): import("react").JSX.Element;
//# sourceMappingURL=LiveState.d.ts.map