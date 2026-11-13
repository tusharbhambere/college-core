import { DEFAULT_ASSET_BASE_URL } from './config.js';
import { CollegeApiError } from './errors.js';
import { staffFullName } from './domain.js';
import { assetUrl } from './helpers.js';
import { cleanText as clean, findContentItem as find, presentableItems } from './presentation.js';
import { loadWebsitePage, normalizeContent } from './website.js';
const record = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
const rows = (v) => Array.isArray(v) ? v.map(record) : [];
/** Infrastructure tabs of `other_data.infrastructure` (Somani). URL token → API key. */
export const INFRASTRUCTURE_SECTIONS = {
    library: "library", gymkhana: "gymkhana", laboratories: "laboratory", "smart-classroom": "smart_class",
    "ladies-common-room": "ladies_common_room", "botanical-garden": "botanical_garden",
};
/** Student-zone tabs of `other_data.student_zone` (Somani). URL token → API key. */
export const STUDENT_ZONE_SECTIONS = {
    council: "council", support: "support", research: "research", complaint: "complaint",
    scholarship: "scholarship", alumni: "alumni_association",
};
/** Readable names for the document collections of `other_data` (Somani institute profile tabs). */
export const INSTITUTE_DOCUMENT_LABELS = {
    college_layout: "College layout", organogram: "Organogram", idp: "Institutional development plan",
    model_code_conduct: "Model code of conduct", policies_and_procedures: "Policies and procedures",
};
/** Institute activity categories (Somani). URL token → exact `activity_type`. */
export const INSTITUTE_ACTIVITY_TYPES = {
    hosted: "Hosted Event", association: "Associations & Committees", sport: "Sports",
    cultural: "Cultural", celebration: "Celebrations",
};
/**
 * Every public website module: the `loadWebsitePage` modules plus complete profile sections
 * (about, society, administration, accreditation, courses), research papers and meetings,
 * MOU batches, alumni feedback polls, committee members, Somani-style infrastructure,
 * student zone, institute activities, home blocks, flash notices and news posts.
 * Empty CMS slots are removed; failures propagate so callers can offer a retry.
 */
export async function loadCollegePage(client, tenant, module, params = {}, options = {}) {
    const page = await loadCollegePageContent(client, tenant, module, params, options.explorePath ?? "/explore");
    return { ...page, items: presentableItems(page.items) };
}
async function loadCollegePageContent(client, tenant, module, params, explorePath) {
    const href = (target, query = {}) => `${explorePath}?${new URLSearchParams(Object.entries({ module: target, ...query }).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))}`;
    const control = record(tenant.profile.landing_control);
    const options = { assetBaseUrl: client.assetBaseUrl ?? DEFAULT_ASSET_BASE_URL };
    const normalize = (value, title) => normalizeContent(value, { ...options, defaultTitle: title });
    const asset = (value) => assetUrl(value, client.assetBaseUrl ?? DEFAULT_ASSET_BASE_URL);
    const text = (id, title, value) => {
        const description = clean(value);
        return description ? [{ id, title, description }] : [];
    };
    const file = (id, title, value) => {
        const url = asset(value);
        return url ? [{ id, title, description: "", files: [{ label: title, url }] }] : [];
    };
    const selection = typeof params.active === "string" ? params.active : "";
    if (module === "alumni-departments") {
        // Registration uses the complete institute directory, including departments
        // that the college has not pinned in its public navigation.
        const { institute } = await client.institutes.departments(tenant.instituteId);
        return { title: "Graduation departments", items: normalize(institute.depart) };
    }
    if (module === "about" || module === "society") {
        const society = module === "society";
        if (society && (params.categoryId || params.id || selection === "about-governing")) {
            return loadWebsitePage(client, tenant, "society", params);
        }
        const source = record(control[society ? "about_society_dynamic" : "about_us_institute_object"]);
        const title = clean(source[society ? "dynamic_name" : "ins_name"]) || (society ? "Our society" : "Our college");
        const groups = {
            [society ? "about" : "profile"]: text("profile", title, source[society ? "about" : "ins_about"]),
            [society ? "vision-mission" : "vmission"]: [...text("vision", "Vision", source.vision), ...text("mission", "Mission", source.mission)],
            organisation: file("organisation", "Organisation structure", source.organisation_structure ?? source.org_structure),
            affiliation: normalize(source.affiliation, "Affiliation"),
            message: normalize({ title: clean(source.founder_message_name), description: clean(source.founder_message_message), image: source.founder_message_image, designation: source.founder_message_designation }),
        };
        const items = selection && groups[selection] ? groups[selection] : Object.values(groups).flat();
        if (society && !selection)
            items.push({ id: "society-governing", title: "Society governing body", description: "", href: href("society", { active: "about-governing" }) });
        return { title, items };
    }
    if (module === "administration" || module === "accreditation") {
        const values = rows(control[module === "administration" ? "administration_object" : "home_accreditation_object"]);
        const selected = selection ? values.filter(v => String(v._id) === selection || selection === `${module === "administration" ? "add" : "acc"}${String(v._id).slice(0, 8)}`) : values;
        const items = selected.flatMap((v, i) => {
            const person = record(v.leading_person);
            const title = clean(v.leading_person_name ?? person.userLegalName ?? v.name ?? v.accreditation_name ?? v.title) || (module === "administration" ? "Administration" : "Accreditation");
            return normalize({ ...v, title, description: v.leading_person_message ?? v.about ?? v.description, image: v.leading_person_photo ?? person.profilePhoto ?? v.image, designation: v.leading_person_position, children: v.combined }, title)
                .map(item => ({ ...item, id: String(v._id ?? `${module}-${i}`) }));
        });
        return { title: module === "administration" ? "Administration" : "Accreditation", items };
    }
    if (module === "applications") {
        // This endpoint groups applications by institute in the original PVG app.
        // The enquiry POST still requires an admission-admin ID, kept separately.
        const { ads_obj } = await client.admissions.ongoing(tenant.instituteId);
        const items = rows(record(ads_obj).ongoing).flatMap(group => {
            const applications = Array.isArray(group.apps) ? rows(group.apps) : [group];
            return applications.filter(app => params.purpose === "enquiry" || app.visible_to_site === "Open").flatMap(app => normalize(app).map(item => ({ ...item, admissionAdminId: tenant.admissionAdminId,
                href: href("application", { id: item.id }),
                meta: [...(item.meta ?? []), clean(group.group_name)].filter(Boolean),
            })));
        });
        return { title: "Open admission applications", items };
    }
    if (module === "courses" || module === "course") {
        const courses = rows(control.academic_courses_desk);
        const selected = params.id ? courses.filter(c => c._id === params.id) : courses;
        const items = selected.map((c, index) => ({
            id: String(c._id ?? index), title: clean(c.head_name) || "Academic programme", description: clean(c.head_about),
            image: asset(Array.isArray(c.head_images) ? c.head_images[0] : undefined),
            ...(module === "courses" ? { href: href("course", { id: String(c._id) }) } : {}),
            children: rows(c.sub_head).map((sub, i) => ({
                id: String(sub._id ?? `programme-${i}`), title: clean(sub.sub_head_title_main ?? sub.sub_head_title),
                description: clean(sub.sub_head_body), image: asset(sub.sub_heading_image),
                children: normalize(sub.sub_topic),
            })),
        }));
        return { title: items.length === 1 ? items[0].title : "Academic programmes", items };
    }
    if (module === "alumni" && params.view === "feedback" && tenant.alumniId) {
        const { all_feedback_poll } = await client.alumni.feedback(tenant.alumniId, params);
        return { title: "Alumni feedback", items: rows(all_feedback_poll).map((q, index) => ({
                id: String(q._id ?? index), title: clean(q.poll_question), description: "",
                children: rows(q.poll_answer).map((answer, i) => ({ id: String(answer._id ?? i), title: clean(answer.content), description: `${Number(answer.percent_vote ?? 0).toFixed(0)}%` })),
            })) };
    }
    if (module === "mous" && !params.id) {
        const page = await loadWebsitePage(client, tenant, "departments");
        return { title: "Collaborations and MOUs", items: page.items.map(item => ({ ...item, href: href("mou-batches", { id: item.id }) })) };
    }
    if (module === "mou-batches" && typeof params.id === "string") {
        const { all_batch } = await client.site.batches(params.id, { page: 1, limit: 100 });
        const items = normalize(all_batch).map(item => ({ ...item, href: href("mous", { id: params.id, batch: item.id }) }));
        items.unshift({ id: "all-mous", title: "All collaborations", description: "", href: href("mous", { id: params.id }) });
        return { title: "Collaboration academic years", items };
    }
    if (module === "research-departments") {
        const { all_depart } = await client.institutes.mergedDepartments(tenant.instituteId, { page: 1, limit: 1000 });
        return { title: params.view === "projects" ? "Department research projects" : "Department research activities", items: normalize(all_depart).map(item => ({
                ...item, href: href(params.view === "projects" ? "projects" : "activities", { sid: item.id, flow: "DEPARTMENT" }),
            })) };
    }
    if (module === "research-papers" && typeof params.id === "string") {
        const { all } = await client.committees.sections(params.id, { ...params, flow: "PAPER", limit: 100 });
        const items = normalize(all).map((item, index) => {
            const paper = rows(all)[index] ?? {};
            return { ...item, meta: [...(item.meta ?? []), clean(record(paper.department).dName),
                    staffFullName(record(paper.staff)), clean(paper.collaboration), clean(paper.funding_agency)].filter(Boolean) };
        });
        return { title: "Research papers", items };
    }
    if (module === "rnd" && (!params.view || params.view === "papers" || params.view === "meetings")) {
        if (!tenant.iqacId)
            return { title: "Research and development", items: [] };
        const { iqac } = await client.committees.dashboard(tenant.iqacId);
        const authority = rows(iqac.authority).find(a => a.custom_head_name === "RND");
        if (!authority?._id)
            return { title: "Research and development", items: [] };
        const authorityId = String(authority._id);
        const { custom } = await client.committees.custom(authorityId);
        const papers = rows(custom.rnd_paper).map((paper, index) => ({ id: String(paper._id ?? index),
            title: clean(paper.head_name) || "Research papers", description: "", href: href("research-papers", { id: String(paper._id) }),
        }));
        if (params.view === "papers")
            return { title: "Research papers", items: papers };
        if (params.view === "meetings")
            return { title: "Research meetings", items: normalize(custom.meetings) };
        return { title: "Research and development", items: [
                ...normalize(custom.about), ...papers, ...normalize(custom.meetings),
                { id: "research-composition", title: "Research committee composition", description: "", href: href("rnd", { id: authorityId, view: "composition" }) },
                { id: "research-collaborations", title: "Collaborations and MOUs", description: "", href: href("mous") },
                { id: "research-projects", title: "Department projects", description: "", href: href("research-departments", { view: "projects" }) },
                { id: "research-activities", title: "Department activities", description: "", href: href("research-departments", { view: "activities" }) },
            ] };
    }
    if ((module === "committee" || module === "rnd") && params.view === "composition" && typeof params.id === "string") {
        const { all_com } = await client.committees.compositions(params.id, { page: 1, limit: 1000 });
        return { title: "Committee composition", items: rows(all_com).flatMap(member => {
                const staff = record(member.staff);
                const student = record(member.student);
                const name = staffFullName(staff) || [student.studentFirstName, student.studentMiddleName, student.studentLastName].map(clean).filter(Boolean).join(" ") || clean(member.name);
                return normalize({ ...member, title: name || "Committee member", image: staff.staffProfilePhoto ?? student.studentProfilePhoto ?? member.image });
            }) };
    }
    if (module === "flash-notice") {
        const { institute } = await client.site.opener(tenant.instituteId);
        const notices = rows(record(institute).site_flash_notice);
        return { title: "Announcement", items: notices.flatMap((notice, index) => {
                const image = asset(notice.notice_image);
                return image ? [{ id: String(notice._id ?? `flash-${index}`), title: clean(notice.notice_title ?? notice.title) || "Announcement", description: clean(notice.notice_description ?? notice.description), image, ...(notice.notice_link ? { href: String(notice.notice_link) } : {}) }] : [];
            }) };
    }
    if (module === "home-about" || module === "principal-messages") {
        const flow = typeof params.is_flow === "string" ? params.is_flow : "Institute";
        const value = module === "home-about"
            ? (await client.site.homeAbout(tenant.instituteId, { is_flow: flow })).home_about_list
            : (await client.site.principalMessages(tenant.instituteId, { is_flow: flow })).home_principal_message_list;
        return { title: module === "home-about" ? "About the college" : "Principal’s message", items: normalize(value) };
    }
    if (module === "news") {
        const { page = 1, limit = 10, p_type } = params;
        const response = await client.events.posts(tenant.instituteId, { page: Number(page), limit: Number(limit), ...(p_type ? { p_type: String(p_type) } : {}) });
        return { title: "News", items: normalize(response.post), total: response.postCount, hasMore: Number(page) < response.totalPage };
    }
    if (module === "side-events") {
        const managerId = typeof params.id === "string" ? params.id : tenant.eventManagerId;
        if (!managerId)
            return { title: "Events", items: [] };
        let all_side;
        try {
            ({ all_side } = await client.events.side(managerId, { page: Number(params.page ?? 1), limit: Number(params.limit ?? 10) }));
        }
        catch (error) {
            // "No Main Event" arrives as access:false with an empty list: an empty result, not a failure.
            const response = error instanceof CollegeApiError ? record(error.details.response) : {};
            if (error instanceof CollegeApiError && error.kind === "api" && Object.values(response).some(v => Array.isArray(v) && !v.length))
                return { title: "Events", items: [] };
            throw error;
        }
        return { title: "Events", items: normalize(all_side).map(item => ({ ...item, href: item.href ?? href("event", { id: item.id }) })) };
    }
    if (module === "infrastructure" || module === "student-zone" || module === "institute-documents") {
        const { other_data } = await client.site.otherModel(tenant.instituteId, { is_flow: "Institute" });
        const data = record(other_data);
        const titles = { infrastructure: "Infrastructure", "student-zone": "Student zone", "institute-documents": "Institute documents" };
        if (module === "institute-documents") {
            // Document collections only: identifiers and references (_id, landing_control, …) are not content.
            const keys = Object.keys(data).filter(key => !["infrastructure", "student_zone"].includes(key) && data[key] !== null && typeof data[key] === "object"
                && (typeof params.view !== "string" || key === params.view));
            return { title: titles[module], items: keys.flatMap(key => {
                    const label = INSTITUTE_DOCUMENT_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
                    const children = normalize(data[key], label);
                    return children.length ? [{ id: `document-${key}`, title: label, description: "", children }] : [];
                }) };
        }
        const sections = module === "infrastructure" ? INFRASTRUCTURE_SECTIONS : STUDENT_ZONE_SECTIONS;
        const group = record(data[module === "infrastructure" ? "infrastructure" : "student_zone"]);
        const selected = typeof params.view === "string" && sections[params.view] ? { [params.view]: sections[params.view] } : sections;
        const items = Object.entries(selected).flatMap(([token, key]) => {
            const section = record(group[key]);
            const label = clean(section.name ?? section.title) || token.replace(/-/g, " ").replace(/^./, c => c.toUpperCase());
            const children = normalize(section.data_list ?? group[key], label);
            if (typeof params.view === "string")
                return children;
            return children.length ? [{ id: `${module}-${token}`, title: label, description: "", children, href: href(module, { view: token }) }] : [];
        });
        return { title: titles[module], items };
    }
    if (module === "institute-activities") {
        if (typeof params.id === "string") {
            const { data_list } = await client.site.otherActivities(params.id);
            return { title: "Institute activities", items: normalize(data_list) };
        }
        const type = typeof params.view === "string" ? INSTITUTE_ACTIVITY_TYPES[params.view] : undefined;
        const { activity_category } = await client.site.otherCategories(tenant.instituteId, type ? { activity_type: type } : {});
        const categories = rows(activity_category).filter(category => !type || category.activity_type === type);
        return { title: type ?? "Institute activities", items: normalize(categories).map(item => ({ ...item, href: href("institute-activities", { id: item.id }) })) };
    }
    const result = await loadWebsitePage(client, tenant, module, params);
    if (["iqac", "naac", "aqar", "nirf", "institutional", "special"].includes(module) && typeof params.node === "string") {
        const node = find(result.items, params.node);
        return node ? { ...result, title: node.title, items: node.children?.length ? node.children : [node] } : result;
    }
    // Department research tabs must retain the department ID and API flow.
    if (module === "department" && typeof params.id === "string") {
        if (result.title === "Department") {
            // The site-info endpoint omits the name; use the college's published directory.
            try {
                const directory = await loadWebsitePage(client, tenant, "departments");
                result.title = directory.items.find(item => item.id === params.id)?.title || result.title;
            }
            catch { /* Keep the loaded department content available if the directory fails. */ }
        }
        result.items = result.items.map(item => item.id === "department-mous" ? { ...item, href: href("mou-batches", { id: params.id }) } : item);
        result.items.push({ id: "department-projects", title: "Projects", description: "", href: href("projects", { sid: params.id, flow: "DEPARTMENT" }) });
    }
    // Return every nested document. Leaf links are retained by the recursive renderer.
    if (module === "alumni" && !params.view)
        result.items.push({ id: "register-alumni", title: "Alumni registration", description: "", href: href("alumni", { view: "registration" }) });
    return result;
}
//# sourceMappingURL=pages.js.map