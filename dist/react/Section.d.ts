type Tone = "default" | "muted" | "primary" | "white" | "tint" | "accent" | "gradient";
export declare function Section({ children, className, id, tone, reveal, }: {
    children: React.ReactNode;
    className?: string;
    id?: string;
    tone?: Tone;
    /** Fade the section content up on first scroll into view (default on). */
    reveal?: boolean;
}): import("react").JSX.Element;
export declare function SectionHeading({ eyebrow, title, description, light, }: {
    eyebrow?: string;
    title: string;
    description?: string;
    light?: boolean;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=Section.d.ts.map