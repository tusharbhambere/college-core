type Variant = "primary" | "secondary" | "ghost" | "brand";
type Props = {
    href?: string;
    children: React.ReactNode;
    variant?: Variant;
    className?: string;
    type?: "button" | "submit" | "reset";
    onClick?: () => void;
    external?: boolean;
    /**
     * Pair secondary and ghost buttons with dark primary surfaces
     * (hero video, PageHero, AdmissionCta). White fill → brand label.
     */
    onDark?: boolean;
    disabled?: boolean;
};
export declare function Button({ href, children, variant, className, type, onClick, external, onDark, disabled, }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map