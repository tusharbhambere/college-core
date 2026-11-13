import type { Activity, AdmissionApplication, AdmissionGroups, AlumniRegistrationBody, Announcement, ApiResponse, Batch, Book, CollegeEvent, DomainMapping, DynamicTab, EventInquiryBody, GalleryCategory, GalleryImage, GalleryVideo, InquiryBody, Institute, JsonRecord, NewsletterBody, PaginationQuery, PublishCounterBody, PublishCounts, Query, SearchQuery, Staff, WebsiteProfile, Mou } from './models.js';
export interface CollegeClientOptions {
    /** Server origin, /api root, or complete /api/v3/public URL. */
    baseUrl: string;
    fetch?: typeof globalThis.fetch;
    /** Includes connection, headers, and reading/decoding the entire response body. Default: 15 seconds. */
    timeoutMs?: number;
    signal?: AbortSignal;
    assetBaseUrl?: string;
}
type Envelope<T extends object> = Promise<ApiResponse<T>>;
type List<K extends string, T = JsonRecord> = {
    [P in K]: T[];
};
type One<K extends string, T = JsonRecord> = {
    [P in K]: T;
};
/** Every method preserves the supplied v3 paths, query names, bodies, and response envelopes. */
export declare function createCollegeClient(options: CollegeClientOptions): {
    baseUrl: string;
    assetBaseUrl: string | undefined;
    institutes: {
        byHost: (host: string) => Envelope<One<"all_domain", DomainMapping | null>>;
        dashboard: (id: string) => Envelope<One<"institute", Institute>>;
        announcements: (id: string, query?: PaginationQuery) => Envelope<List<"announcement", Announcement>>;
        announcement: (aid: string) => Envelope<One<"announcement", Announcement>>;
        departments: (id: string, query?: Query & {
            which_type?: string;
        }) => Envelope<One<"institute", Institute>>;
        staff: (id: string, query?: PaginationQuery) => Envelope<List<"staffIns", Staff>>;
        staffDetail: (sid: string) => Envelope<One<"staff_detail", Staff>>;
        batches: (id: string, query?: PaginationQuery) => Envelope<List<"all_batch", Batch>>;
        mergedDepartments: (id: string, query?: PaginationQuery) => Envelope<List<"all_depart", Institute>>;
    };
    landing: {
        profile: (id: string) => Envelope<One<"one_ins", WebsiteProfile>>;
        faculty: (did: string, query?: PaginationQuery) => Envelope<List<"all_staff", Staff>>;
        pinnedDepartments: (id: string, query?: Query) => Envelope<One<"ins", Institute | (string | JsonRecord)[]>>;
        pinnedDepartment: (id: string, query?: Query) => Envelope<One<"ins", Institute | (string | JsonRecord)[]>>;
        examinations: (lcid: string) => Envelope<One<"landing", JsonRecord>>;
    };
    admissions: {
        ongoing: (id: string) => Envelope<One<"ads_obj", AdmissionGroups>>;
        application: (aid: string) => Envelope<One<"oneApply", AdmissionApplication>>;
        dashboard: (aid: string, query?: Query) => Envelope<One<"admission", JsonRecord> & One<"roles", unknown>>;
        scholarships: (aid: string, query?: PaginationQuery & {
            status?: string;
        }) => Envelope<List<"all_scholar", JsonRecord>>;
        documents: (aid: string, query?: PaginationQuery) => Envelope<List<"all_docs", JsonRecord> & One<"count", number>>;
        inquire: (aid: string, body: InquiryBody) => Envelope<JsonRecord>;
    };
    finance: {
        structures: (did: string, query?: PaginationQuery & {
            filter_by?: string;
            batch_by?: string;
        }) => Envelope<List<"all_structures", JsonRecord>>;
        structure: (fsid: string) => Envelope<One<"structure", JsonRecord>>;
    };
    library: {
        books: (lid: string, query?: SearchQuery) => Envelope<List<"books", Book>>;
        /** The backend returns [] for an empty search; it does not list the complete catalogue. */
        opac: (lid: string, query?: SearchQuery & {
            is_search_by?: "subject" | "author" | "book_title" | string;
        }) => Envelope<List<"books", Book>>;
    };
    staff: {
        generateCv: (sid: string) => Envelope<One<"excel_key", string>>;
    };
    alumni: {
        dashboard: (aid: string) => Envelope<One<"one_alumini", JsonRecord>>;
        prominent: (aid: string, query?: PaginationQuery) => Envelope<List<"all_prominent", JsonRecord>>;
        feedback: (aid: string, query?: PaginationQuery) => Envelope<List<"all_feedback_poll", JsonRecord>>;
        register: (aid: string, body: AlumniRegistrationBody) => Envelope<JsonRecord>;
    };
    events: {
        list: (eid: string, query?: SearchQuery) => Envelope<List<"all_events", CollegeEvent> & One<"count", number>>;
        one: (evid: string) => Envelope<One<"one_event", CollegeEvent>>;
        posts: (id: string, query?: PaginationQuery & {
            p_type?: string;
        }) => Envelope<List<"post", JsonRecord> & One<"postCount", number> & One<"totalPage", number>>;
        side: (eid: string, query?: SearchQuery) => Envelope<List<"all_side", CollegeEvent>>;
        inquire: (id: string, body: EventInquiryBody) => Envelope<JsonRecord>;
        subscribe: (id: string, body: NewsletterBody) => Envelope<JsonRecord>;
    };
    site: {
        admission: (aid: string) => Envelope<One<"admission_site", JsonRecord>>;
        department: (did: string) => Envelope<One<"department_site", JsonRecord>>;
        library: (lid: string) => Envelope<One<"library_site", JsonRecord>>;
        opener: (id: string) => Envelope<One<"institute", Institute | null>>;
        batches: (did: string, query?: PaginationQuery) => Envelope<List<"all_batch", Batch>>;
        mous: (did: string, query?: SearchQuery & {
            batch?: string;
            u_batch?: string;
        }) => Envelope<List<"all_mou", Mou>>;
        activity: (acid: string) => Envelope<One<"act", Activity>>;
        activities: (query?: SearchQuery) => Envelope<List<"all_act", Activity>>;
        activitiesByType: (query?: SearchQuery) => Envelope<List<"all_act", Activity>>;
        projects: (query?: PaginationQuery) => Envelope<List<"all_act", Activity>>;
        dynamicTabs: (lcid: string) => Envelope<List<"dynamic_tab", DynamicTab>>;
        dynamicChildren: (sdid: string, query?: Query & {
            parent_key?: string;
        }) => Envelope<List<"data_list", DynamicTab>>;
        moduleTabs: (lcid: string, query?: Query & {
            is_flow?: string;
            module_type?: string;
        }) => Envelope<List<"dynamic_tab", DynamicTab>>;
        moduleChildren: (mdi: string, query?: Query & {
            parent_key?: string;
        }) => Envelope<List<"data_list", DynamicTab>>;
        studentCorner: (lcid: string) => Envelope<List<"student_corner", JsonRecord>>;
        governingCategories: (lcid: string, query?: PaginationQuery) => Envelope<List<"category_list", JsonRecord>>;
        governingBody: (lcid: string, cid: string, query?: PaginationQuery) => Envelope<List<"category_body_list", JsonRecord>>;
        societyCategories: (lcid: string, query?: PaginationQuery) => Envelope<List<"category_list", JsonRecord>>;
        societyBody: (lcid: string, cid: string, query?: PaginationQuery) => Envelope<List<"category_body_list", JsonRecord>>;
        homeAbout: (id: string, query?: Query & {
            is_flow?: string;
        }) => Envelope<List<"home_about_list", JsonRecord>>;
        principalMessages: (id: string, query?: Query & {
            is_flow?: string;
        }) => Envelope<List<"home_principal_message_list", JsonRecord>>;
        otherModel: (id: string, query?: Query & {
            is_flow?: string;
        }) => Envelope<One<"other_data", unknown>>;
        otherCategories: (id: string, query?: Query & {
            activity_type?: string;
        }) => Envelope<List<"activity_category", JsonRecord>>;
        otherActivities: (cid: string) => Envelope<List<"data_list", JsonRecord>>;
        publishCounts: (id: string, query?: Query & {
            is_type?: string;
        }) => Envelope<One<"detail", PublishCounts>>;
        incrementPublishCounts: (id: string, body: PublishCounterBody) => Envelope<JsonRecord>;
    };
    committees: {
        dashboard: (qid: string) => Envelope<One<"iqac", JsonRecord>>;
        custom: (qcid: string) => Envelope<One<"custom", JsonRecord>>;
        compositions: (qcid: string, query?: PaginationQuery) => Envelope<List<"all_com", JsonRecord>>;
        sections: (hid: string, query?: PaginationQuery) => Envelope<List<"all", JsonRecord>>;
        about: (qcid: string, query?: PaginationQuery) => Envelope<List<"all_com", JsonRecord>>;
        auditReports: (qcid: string, query?: PaginationQuery) => Envelope<List<"all_com", JsonRecord>>;
        naac: (qcid: string) => Envelope<One<"custom", JsonRecord>>;
        activities: (cid: string, query?: PaginationQuery) => Envelope<List<"activity", Activity>>;
        iqacDetails: (iqdid: string) => Envelope<One<"q_detail", JsonRecord>>;
        irins: (cid: string) => Envelope<List<"irins_list", JsonRecord>>;
    };
    gallery: {
        imageCategories: (id: string, query?: Query & {
            bid?: string;
        }) => Envelope<List<"gallery_category", GalleryCategory>>;
        images: (cid: string, query?: Query & {
            flow?: string;
            batchId?: string;
        }) => Envelope<List<"image_list", string | GalleryImage>>;
        videoCategories: (id: string, query?: Query & {
            bid?: string;
        }) => Envelope<List<"gallery_category", GalleryCategory>>;
        videos: (cid: string, query?: Query & {
            flow?: string;
            batchId?: string;
        }) => Envelope<List<"video_list", string | GalleryVideo>>;
    };
};
export type CollegeClient = ReturnType<typeof createCollegeClient>;
export {};
//# sourceMappingURL=client.d.ts.map