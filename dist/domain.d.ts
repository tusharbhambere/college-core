import type { Department, JsonRecord, Staff } from './models.js';
export interface StaffDynamicField extends JsonRecord {
    key?: string;
    value?: unknown;
}
/** Optional public staff fields used by the existing college business rules. */
export interface StaffRecord extends Staff {
    teaching_type?: string;
    staff_technicality?: string;
    current_designation?: string;
    staff_dynamic_field?: StaffDynamicField[];
    staff_department?: Department;
}
export type StaffCategory = 'teaching' | 'non-teaching' | 'other';
export type StaffPolicy = 'bhavan' | 'somani';
export interface StaffFilterOptions {
    /** Bhavan partitions mutually exclusively; Somani retains its college and principal rules. */
    policy?: StaffPolicy;
    /** Somani treats every value except junior, including absence, as the senior selection. */
    active?: string;
    collegeTypeFieldKey?: string;
}
export interface StaffPartitions<T> {
    teaching: T[];
    nonTeaching: T[];
    other: T[];
}
export interface StaffDesignationGroups<T> {
    principal: T[];
    leader: T[];
    mid: T[];
    staff: T[];
}
export declare const DEFAULT_COLLEGE_TYPE_FIELD_KEY = "college_type1757566231761";
/** Filters in API order, including Somani's intentionally overlapping other/principal rules. */
export declare function filterStaff<T extends StaffRecord>(people: readonly T[], category: StaffCategory, options?: StaffFilterOptions): T[];
/** Produces all three groups using the selected existing site's classification policy. */
export declare function partitionStaff<T extends StaffRecord>(people: readonly T[], options?: StaffFilterOptions): StaffPartitions<T>;
/** Retains the designation ordering rules of Somani's faculty surface. */
export declare function groupStaffByDesignation<T extends StaffRecord>(people: readonly T[], category?: StaffCategory): StaffDesignationGroups<T>;
/** Omits period-only names and optionally includes the first prefix dynamic field. */
export declare function staffFullName(person: StaffRecord, options?: {
    includePrefix?: boolean;
}): string;
/** Applies the local ordinary-staff name and exact department filter, preserving order. */
export declare function filterStaffByName<T extends StaffRecord>(people: readonly T[], search?: string, options?: {
    departmentName?: string;
}): T[];
/** Recognizes only the three hostname aliases used by the current source policy. */
export declare function isBhavansHost(host: string): boolean;
/** Matches the source's punctuation-insensitive, explicitly configured course names. */
export declare function isSelfFinancingDepartment(department: Department): boolean;
/** Sorts Bhavan host departments and splits its Senior College self-financing courses. */
export declare function groupDepartments<T extends Department>(departments: readonly T[], options?: {
    host?: string;
    dependentType?: string;
}): {
    regular: T[];
    selfFinancing: T[];
};
//# sourceMappingURL=domain.d.ts.map