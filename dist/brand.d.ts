import type { TenantContext } from './tenant.js';
export type NavLink = {
    label: string;
    href: string;
    external?: boolean;
};
export type NavItem = NavLink & {
    children?: NavLink[];
    /** Filled at runtime from a live list. */
    dynamic?: 'departments' | 'committee' | 'student-corner' | 'dynamic';
};
export interface CollegeBrandOptions {
    /** CDN base for storage keys. Defaults to the shared Qviple CDN. */
    assetBaseUrl?: string;
    /** Route that renders `loadCollegePage` modules. Default: `/explore`. */
    explorePath?: string;
    /** Route of the contact page (enquiry form at `#enquiry`). Default: `/contact`. */
    contactPath?: string;
}
/**
 * The selected college's identity, home-page sections and navigation, derived only from
 * its live profile and module switches (never from another college's static content).
 */
export declare function collegeBrand(tenant: TenantContext, options?: CollegeBrandOptions): {
    name: string;
    shortName: string;
    nameRest: string;
    affiliation: string;
    accreditation: string;
    address: string;
    email: string;
    phone: string;
    logo: string | undefined;
    affiliationLogo: string | undefined;
    heroImages: string[];
    themeColor: string | undefined;
    aboutTitle: string;
    about: string;
    vision: string;
    mission: string;
    courses: {
        id: string;
        name: string;
        about: string;
        image: string | undefined;
        programmes: {
            id: string;
            name: string;
        }[];
    }[];
    openers: {
        label: string;
        href: string | undefined;
        image: string | undefined;
    }[];
    quickLinks: NavLink[];
    footerLinks: NavLink[];
    testimonials: {
        name: string;
        quote: string;
        role: string;
        image: string | undefined;
    }[];
    sections: {
        hero: boolean;
        about: boolean;
        openers: boolean;
        departments: boolean;
        visionMission: boolean;
        testimonials: boolean;
        notices: boolean;
        events: boolean;
        admissions: boolean;
    };
    nav: NavItem[];
    utility: NavLink[];
    /** Flat list of top-level destinations (footer, sitemap). */
    links: {
        label: string;
        href: string;
    }[];
};
export type CollegeBrand = ReturnType<typeof collegeBrand>;
//# sourceMappingURL=brand.d.ts.map