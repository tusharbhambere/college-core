/** Backend objects deliberately retain unknown fields for tenant-defined content. */
export interface JsonRecord {
    [key: string]: unknown;
}
export interface Entity extends JsonRecord {
    _id?: string;
    createdAt?: string;
    updatedAt?: string;
}
export type EntityRef = string | Entity;
export type ApiResponse<T extends object = JsonRecord> = T & {
    access?: boolean;
    message?: string;
};
export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;
export interface PaginationQuery extends Query {
    page?: number;
    limit?: number;
}
export interface SearchQuery extends PaginationQuery {
    search?: string;
}
export interface Institute extends Entity {
    insName?: string;
    name?: string;
    insEmail?: string;
    insPhoneNumber?: string | number;
    insAddress?: string;
    admissionDepart?: EntityRef[];
    financeDepart?: EntityRef[];
    hostelDepart?: EntityRef[];
    aluminiDepart?: EntityRef[];
    library?: EntityRef[];
    eventManagerDepart?: EntityRef[];
    iqac_module?: EntityRef[];
    departments?: Department[];
}
export interface DomainMapping extends Entity {
    link_up?: Institute | string;
    status?: string | boolean;
}
export interface LandingControl extends Entity {
    home_header_object?: JsonRecord;
    home_background_object?: JsonRecord;
    about_us_institute_object?: JsonRecord;
    tab_toggle?: Record<string, boolean>;
    screen_toggle?: Record<string, boolean>;
    about_us_toggle?: Record<string, boolean>;
    academic_courses_desk?: JsonRecord[];
    administration_object?: JsonRecord[];
    footer_links?: JsonRecord;
    home_opener_quick_links?: JsonRecord;
}
export interface WebsiteProfile extends Institute {
    landing_control?: LandingControl;
    website_active_tab?: Record<string, boolean>;
}
export interface PublicDocument extends Entity {
    documentKey?: string;
    documentName?: string;
    documentType?: string;
}
export interface Announcement extends Entity {
    insAnnTitle?: string;
    insAnnDescription?: string;
    insAnnPhoto?: string;
    attach?: string;
    announcementDocument?: PublicDocument[];
}
export interface Department extends Entity {
    dName?: string;
    department_name?: string;
    departmentName?: string;
    dAbout?: string;
    dHead?: EntityRef;
}
export interface Staff extends Entity {
    staffFirstName?: string;
    staffMiddleName?: string;
    staffLastName?: string;
    staffProfilePhoto?: string;
    staffDesignation?: string;
}
export interface AdmissionApplication extends Entity {
    applicationName?: string;
    application_name?: string;
    applicationTitle?: string;
    application_link?: string;
    application_start_date?: string;
    application_end_date?: string;
}
export interface ApplicationGroup extends JsonRecord {
    group_name: string;
    apps: AdmissionApplication[];
}
export interface AdmissionGroups extends JsonRecord {
    ongoing: ApplicationGroup[];
}
export interface Mou extends Entity {
    org_name?: string;
    institution_industry?: string;
    durations?: string;
    link?: string;
    attach?: string;
    student_count?: number;
    staff_count?: number;
}
export interface Batch extends Entity {
    batchName?: string;
    batch_name?: string;
    universal_batch_name?: string;
}
export interface Book extends Entity {
    bookName?: string;
    bookAuthor?: string;
    bookImage?: string;
    bookSubject?: string;
    book_title?: string;
    author?: string;
}
export interface CollegeEvent extends Entity {
    event_name?: string;
    event_description?: string;
    event_banner?: string;
    event_date?: string;
    event_time?: string;
    event_status?: string;
    event_location?: string;
    event_place?: string;
    event_guest?: string;
    for_department?: EntityRef[];
}
export interface Activity extends Entity {
    activity_name?: string;
    activity_title?: string;
    activity_description?: string;
    activity_type?: string;
    activity_images?: string[];
}
export interface DynamicTab extends Entity {
    name?: string;
    tab_name?: string;
    title?: string;
    tab_title?: string;
    parent_key?: string;
    data?: unknown;
    children?: DynamicTab[];
}
export interface GalleryCategory extends Entity {
    name?: string;
    category_name?: string;
    title?: string;
}
export interface GalleryImage extends Entity {
    image?: string;
    image_key?: string;
    title?: string;
}
export interface GalleryVideo extends Entity {
    video?: string;
    video_link?: string;
    title?: string;
}
export interface PublishCounts extends JsonRecord {
    download_count: number;
    view_count: number;
}
export interface InquiryBody {
    inquiry_application?: string;
    inquiry_student_name?: string;
    inquiry_student_gender?: string;
    inquiry_student_dob?: string;
    inquiry_student_address?: string;
    inquiry_student_photo?: string;
    inquiry_student_mobileNo?: number;
    inquiry_student_previous?: string;
    inquiry_student_remark?: string;
    inquiry_student_email?: string;
    inquiry_student_city?: string;
    inquiry_student_message?: string;
}
export interface AlumniRegistrationBody {
    name: string;
    email: string;
    phone_number: number;
    graduation_department: string;
    pass_year: string;
    job_status: string;
    company_name: string;
    company_location: string;
    higher_study: string;
}
export interface EventInquiryBody {
    name: string;
    mobile: number;
    email: string;
    event_type: string;
    query: string;
    designation: string;
    event_inquiry_location: string;
}
export interface NewsletterBody {
    name: string;
    email: string;
}
/** The server increments every supplied key other than is_type, regardless of its value. */
export interface PublishCounterBody {
    is_type: string;
    view_count?: boolean;
    download_count?: boolean;
}
//# sourceMappingURL=models.d.ts.map