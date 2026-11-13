import type { Department, JsonRecord, Staff } from './models.js';

export interface StaffDynamicField extends JsonRecord { key?: string; value?: unknown }
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
export interface StaffPartitions<T> { teaching: T[]; nonTeaching: T[]; other: T[] }
export interface StaffDesignationGroups<T> { principal: T[]; leader: T[]; mid: T[]; staff: T[] }

const teachingTypes = new Set(['Teaching', 'Teaching Faculty']);
const nonTeachingTypes = new Set(['Non-Teaching', 'Non-Teaching Faculty']);
const knownTypes = new Set([...teachingTypes, ...nonTeachingTypes]);
export const DEFAULT_COLLEGE_TYPE_FIELD_KEY = 'college_type1757566231761';

const isTeaching = (person: StaffRecord): boolean =>
  teachingTypes.has(person.teaching_type ?? '') || teachingTypes.has(person.staff_technicality ?? '');
const isNonTeaching = (person: StaffRecord): boolean =>
  nonTeachingTypes.has(person.teaching_type ?? '') || nonTeachingTypes.has(person.staff_technicality ?? '');

/** Filters in API order, including Somani's intentionally overlapping other/principal rules. */
export function filterStaff<T extends StaffRecord>(
  people: readonly T[], category: StaffCategory, options: StaffFilterOptions = {},
): T[] {
  return people.filter((person) => {
    if (options.policy !== 'somani') {
      const selected = isTeaching(person) ? 'teaching' : isNonTeaching(person) ? 'non-teaching' : 'other';
      return selected === category;
    }
    const designation = (person.current_designation ?? '').toLowerCase();
    if (category === 'non-teaching') return isNonTeaching(person) || designation.includes('principal');
    if (category === 'other') {
      return !knownTypes.has(person.teaching_type ?? '') || !knownTypes.has(person.staff_technicality ?? '');
    }
    if (!isTeaching(person)) return false;
    const collegeType = (person.staff_dynamic_field ?? []).find(
      (field) => field.key === (options.collegeTypeFieldKey ?? DEFAULT_COLLEGE_TYPE_FIELD_KEY),
    )?.value;
    return options.active === 'junior'
      ? collegeType === 'Junior College' || (designation.includes('principal') && !designation.includes('vice'))
      : collegeType === 'Senior College';
  });
}

/** Produces all three groups using the selected existing site's classification policy. */
export function partitionStaff<T extends StaffRecord>(
  people: readonly T[], options: StaffFilterOptions = {},
): StaffPartitions<T> {
  return {
    teaching: filterStaff(people, 'teaching', options),
    nonTeaching: filterStaff(people, 'non-teaching', options),
    other: filterStaff(people, 'other', options),
  };
}

/** Retains the designation ordering rules of Somani's faculty surface. */
export function groupStaffByDesignation<T extends StaffRecord>(
  people: readonly T[], category: StaffCategory = 'teaching',
): StaffDesignationGroups<T> {
  const groups: StaffDesignationGroups<T> = { principal: [], leader: [], mid: [], staff: [] };
  for (const person of people) {
    const designation = (person.current_designation ?? '').toLowerCase();
    if (designation.includes('vice') && designation.includes('principal')) groups.leader.push(person);
    else if (designation.includes('principal')) groups.principal.push(person);
    else if (category === 'teaching' && designation.includes('supervisor')) groups.leader.push(person);
    else if (category !== 'teaching' && (designation.includes('superintendent') || designation.includes('head clerk'))) groups.mid.push(person);
    else groups.staff.push(person);
  }
  return groups;
}

const cleanNamePart = (value: string | undefined): string => /^[.\s]*$/.test(value ?? '') ? '' : value ?? '';

/** Omits period-only names and optionally includes the first prefix dynamic field. */
export function staffFullName(person: StaffRecord, options: { includePrefix?: boolean } = {}): string {
  const prefixValue = options.includePrefix === false ? undefined :
    (person.staff_dynamic_field ?? []).find((field) => field.key?.startsWith('prefix'))?.value;
  const prefix = typeof prefixValue === 'string' ? prefixValue : '';
  const first = cleanNamePart(person.staffFirstName);
  const middle = cleanNamePart(person.staffMiddleName);
  const last = cleanNamePart(person.staffLastName);
  return `${prefix ? `${prefix} ` : ''}${first}${middle ? ` ${middle}` : ''} ${last}`.trim();
}

/** Applies the local ordinary-staff name and exact department filter, preserving order. */
export function filterStaffByName<T extends StaffRecord>(
  people: readonly T[], search = '', options: { departmentName?: string } = {},
): T[] {
  const term = search.trim().toLowerCase();
  return people.filter((person) => {
    if (options.departmentName && options.departmentName !== 'all' && person.staff_department?.dName !== options.departmentName) return false;
    return !term || staffFullName(person).toLowerCase().includes(term);
  });
}

const bhavansHosts = new Set(['bhavanschowpatty', 'bhavanschowpatty.ac.in', 'bhavanschowpatty.qviple.com']);
/** Recognizes only the three hostname aliases used by the current source policy. */
export function isBhavansHost(host: string): boolean { return bhavansHosts.has(host.trim().toLowerCase()); }

const departmentKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const selfFinancingNames = new Set(['B.Com (A&F)', 'B.COM (M.S.)', 'B.Sc. (I.T.)', 'M.COM'].map(departmentKey));

/** Matches the source's punctuation-insensitive, explicitly configured course names. */
export function isSelfFinancingDepartment(department: Department): boolean {
  return selfFinancingNames.has(departmentKey(department.dName ?? ''));
}

/** Sorts Bhavan host departments and splits its Senior College self-financing courses. */
export function groupDepartments<T extends Department>(
  departments: readonly T[], options: { host?: string; dependentType?: string } = {},
): { regular: T[]; selfFinancing: T[] } {
  const isBhavans = isBhavansHost(options.host ?? '');
  const ordered = isBhavans
    ? [...departments].sort((a, b) => (a.dName ?? '').localeCompare(b.dName ?? ''))
    : [...departments];
  if (!isBhavans || options.dependentType !== 'Senior College') return { regular: ordered, selfFinancing: [] };
  return {
    regular: ordered.filter((department) => !isSelfFinancingDepartment(department)),
    selfFinancing: ordered.filter(isSelfFinancingDepartment),
  };
}
