import { assetUrl, enabledModules, safeUrl } from './helpers.js';
import { cleanText as text } from './presentation.js';
import { DEFAULT_ASSET_BASE_URL } from './config.js';
/** Reads `{ link_1: { name, link_images }, … }` objects the backend uses for link slots. */
function linkSlots(value) {
    if (!value || typeof value !== 'object')
        return [];
    return Object.values(value).flatMap((slot) => {
        const label = text(slot?.name);
        const href = safeUrl(slot?.link_images);
        return label && href ? [{ label, href, external: true }] : [];
    });
}
const asRecord = (value) => (value && typeof value === 'object' ? value : {});
/**
 * The selected college's identity, home-page sections and navigation, derived only from
 * its live profile and module switches (never from another college's static content).
 */
export function collegeBrand(tenant, options = {}) {
    const explorePath = options.explorePath ?? '/explore';
    const contactPath = options.contactPath ?? '/contact';
    const explore = (module, extra = '') => `${explorePath}?module=${module}${extra}`;
    const profile = tenant.profile;
    const control = profile.landing_control;
    const header = asRecord(control?.home_header_object);
    const about = asRecord(control?.about_us_institute_object);
    const background = asRecord(control?.home_background_object);
    const images = Array.isArray(background.images) ? background.images : [];
    const on = enabledModules(profile);
    const screens = control?.screen_toggle ?? {};
    const aboutToggle = control?.about_us_toggle ?? {};
    const show = (key) => screens[key] !== false;
    const asset = (key) => assetUrl(key, options.assetBaseUrl ?? DEFAULT_ASSET_BASE_URL);
    const courses = (Array.isArray(control?.academic_courses_desk) ? control.academic_courses_desk : [])
        .map((head) => ({
        id: String(head._id ?? ''),
        name: text(head.head_name),
        about: text(head.head_about),
        image: Array.isArray(head.head_images) ? asset(head.head_images[0]) : undefined,
        programmes: (Array.isArray(head.sub_head) ? head.sub_head : [])
            .map((sub) => ({ id: String(sub._id ?? ''), name: text(sub.sub_head_title_main) }))
            .filter((sub) => sub.name),
    }))
        .filter((head) => head.id && head.name);
    const openers = Object.values(asRecord(control?.home_opener_background_object)).flatMap((slot) => {
        const s = asRecord(slot);
        const label = text(s.name);
        const href = safeUrl(s.link_images);
        return label ? [{ label, href, image: asset(s.attach) }] : [];
    });
    // Grouped like the Gosavi template: a few top-level menus, each with a dropdown.
    const group = (label, children, href = children[0]?.href) => children.length && href ? [{ label, href, children }] : [];
    const nav = [{ label: 'Home', href: '/' }];
    if (on.about !== false) {
        nav.push(...group('About', [
            ...(aboutToggle.institute_profile !== false ? [{ label: 'About the College', href: explore('about') }] : []),
            { label: 'Vision & Mission', href: '/#vision-mission' },
            ...(aboutToggle.about_society !== false ? [{ label: 'Our Society', href: explore('society') }] : []),
            ...(aboutToggle.administration !== false ? [{ label: 'Administration', href: explore('administration') }] : []),
            ...(aboutToggle.accreditation !== false ? [{ label: 'Accreditation', href: explore('accreditation') }] : []),
            ...(aboutToggle.governing_body !== false ? [{ label: 'Governance', href: explore('governance') }] : []),
        ]));
    }
    nav.push(...group('Academics', [
        ...(on.academic_course !== false ? courses.map((c) => ({ label: c.name, href: explore('course', `&id=${c.id}`) })) : []),
        ...(aboutToggle.faculties !== false ? [{ label: 'Faculty & Staff', href: explore('faculty') }] : []),
        ...(on.examination !== false ? [{ label: 'Examinations', href: explore('examinations') }] : []),
        ...(on.library !== false ? [{ label: 'Library', href: explore('library') }] : []),
    ], on.academic_course !== false && courses.length ? '/academics' : undefined));
    if (on.department !== false)
        nav.push({ label: 'Departments', href: explore('departments'), dynamic: 'departments' });
    if (on.committee !== false && tenant.iqacId)
        nav.push({ label: 'Committees', href: explore('committee'), dynamic: 'committee' });
    if (on.admission !== false) {
        nav.push(...group('Admissions', [
            { label: 'Admission Information', href: explore('admissions') },
            ...(on.new_admission !== false ? [{ label: 'Open Applications', href: explore('applications') }] : []),
            { label: 'Fee Structure', href: explore('fees') },
            { label: 'Required Documents', href: explore('documents') },
            { label: 'Scholarships', href: explore('scholarships') },
            { label: 'Admission Enquiry', href: `${contactPath}#enquiry` },
        ]));
    }
    if (on.rnd !== false && tenant.iqacId) {
        nav.push(...group('Research', [
            { label: 'Research & Development', href: explore('rnd') },
            { label: 'Research Papers', href: explore('rnd', '&view=papers') },
            { label: 'Research Meetings', href: explore('rnd', '&view=meetings') },
            { label: 'MoUs & Collaborations', href: explore('mous') },
            { label: 'Projects', href: explore('research-departments', '&view=projects') },
            { label: 'Activities', href: explore('research-departments', '&view=activities') },
        ]));
    }
    if (on.iqac !== false && tenant.iqacId) {
        nav.push(...group('IQAC', [
            { label: 'IQAC', href: explore('iqac') },
            ...(on.naac !== false ? [{ label: 'NAAC', href: explore('naac') }] : []),
            ...(on.aqar !== false ? [{ label: 'AQAR', href: explore('aqar') }] : []),
            ...(on.nirf !== false ? [{ label: 'NIRF', href: explore('nirf') }] : []),
            ...(on.institutional !== false ? [{ label: 'Institutional Distinctiveness', href: explore('institutional') }] : []),
            ...(on.special !== false ? [{ label: 'Special Status', href: explore('special') }] : []),
        ]));
    }
    nav.push(...group('Campus Life', [
        ...(on.notice !== false ? [{ label: 'Notices & Circulars', href: explore('notices') }] : []),
        ...(on.events !== false ? [{ label: 'Events', href: explore('events') }] : []),
        ...(on.image_gallery !== false ? [{ label: 'Photo Gallery', href: explore('gallery') }] : []),
        ...(on.video_gallery !== false ? [{ label: 'Video Gallery', href: explore('videos') }] : []),
        ...(on.alumni !== false ? [{ label: 'Alumni', href: explore('alumni') }] : []),
    ]));
    if (on.contact_us !== false)
        nav.push({ label: 'Contact', href: contactPath });
    if (on.student_corner !== false)
        nav.push({ label: 'Student Corner', href: explore('student-corner'), dynamic: 'student-corner' });
    if (tenant.landingControlId)
        nav.push({ label: 'Resources', href: explore('dynamic'), dynamic: 'dynamic' });
    const utility = [
        ...(on.new_admission !== false && on.admission !== false ? [{ label: 'New Admission', href: explore('applications') }] : []),
        ...(on.image_gallery !== false ? [{ label: 'Photo Gallery', href: explore('gallery') }] : []),
        ...(on.video_gallery !== false ? [{ label: 'Video Gallery', href: explore('videos') }] : []),
        ...(on.contact_us !== false ? [{ label: 'Contact Us', href: contactPath }] : []),
    ];
    const name = text(header.ins_name) || text(profile.insName) || tenant.host;
    // 'R.H. Sapat College of Engineering, Management Studies & Research' →
    // short 'R.H. Sapat College of Engineering' + 'Management Studies & Research'.
    const comma = name.indexOf(', ');
    const shortName = comma > 0 ? name.slice(0, comma) : name;
    const nameRest = comma > 0 ? name.slice(comma + 2) : '';
    const testimonials = (Array.isArray(profile.testimonials) ? profile.testimonials : [])
        .map((t) => ({
        name: text(t.name ?? t.student_name),
        quote: text(t.description ?? t.message ?? t.testimonial),
        role: text(t.designation ?? t.batch),
        image: asset(t.image ?? t.photo),
    }))
        .filter((t) => t.name && t.quote);
    return {
        name,
        shortName,
        nameRest,
        affiliation: text(header.affiliation_with),
        accreditation: text(header.accreditations),
        address: text(header.ins_address) || text(profile.insAddress),
        email: text(header.ins_email) || text(profile.insEmail),
        phone: text(header.ins_phone_number) || text(profile.insPhoneNumber),
        logo: asset(header.ins_logo ?? profile.insProfilePhoto),
        affiliationLogo: asset(header.affiliation_logo),
        heroImages: images.map(asset).filter((src) => Boolean(src)),
        themeColor: typeof background.color_theme === 'string' ? background.color_theme : undefined,
        aboutTitle: text(about.ins_name) || name,
        about: text(asRecord(control?.home_about_institute_object).about) || text(about.ins_about),
        vision: text(about.vision),
        mission: text(about.mission),
        courses,
        openers,
        quickLinks: linkSlots(control?.home_opener_quick_links),
        footerLinks: [
            ...linkSlots(control?.footer_links),
            ...Object.entries(asRecord(control?.footer_links)).flatMap(([key, value]) => {
                const href = typeof value === 'string' ? safeUrl(value) : undefined;
                return href ? [{ label: key.replace(/_link$/, '').replace(/_/g, ' '), href, external: true }] : [];
            }),
        ],
        testimonials,
        sections: {
            hero: show('bg_image'),
            about: show('about_institute'),
            openers: show('bg1_bg2'),
            departments: show('our_department') && on.department !== false,
            visionMission: show('vission_mission'),
            testimonials: show('testimonials'),
            notices: on.notice !== false,
            events: on.events !== false,
            admissions: on.admission !== false,
        },
        nav,
        utility,
        /** Flat list of top-level destinations (footer, sitemap). */
        links: nav.filter((item) => item.href !== '/').map(({ label, href }) => ({ label, href })),
    };
}
//# sourceMappingURL=brand.js.map