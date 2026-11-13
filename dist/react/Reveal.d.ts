type RevealProps = {
    children: React.ReactNode;
    className?: string;
};
/**
 * Scroll-reveal wrapper: fades content up the first time it enters the
 * viewport. The hidden state is gated behind `html.js` (see globals.css),
 * so content remains visible without JavaScript, and reduced-motion users
 * see it instantly.
 */
export declare function Reveal({ children, className }: RevealProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Reveal.d.ts.map