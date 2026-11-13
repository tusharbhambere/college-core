import type { CollegeClient } from './client.js';
import { CollegeApiError, isId } from './errors.js';
import type { DomainMapping, Institute, WebsiteProfile } from './models.js';

export interface TenantContext {
  host: string;
  instituteId: string;
  admissionAdminId?: string;
  admissionAdminIds: string[];
  financeId?: string;
  hostelId?: string;
  alumniId?: string;
  libraryId?: string;
  eventManagerId?: string;
  eventManagerIds: string[];
  landingControlId?: string;
  iqacId?: string;
  dashboard: Institute;
  profile: WebsiteProfile;
  domain: DomainMapping;
}

function referenceId(value: unknown): string | undefined {
  const id = typeof value === 'object' && value !== null && '_id' in value ? value._id : value;
  return isId(id) ? id : undefined;
}

function referenceIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(referenceId).filter((id): id is string => id !== undefined))];
}

function mappedInstituteId(host: string, domain: DomainMapping | null): string {
  const instituteId = referenceId(domain?.link_up);
  if (!instituteId) throw new CollegeApiError('tenant', `No institute is mapped to host "${host}".`, { response: domain });
  return instituteId;
}

/** Builds the same dependency IDs used by the existing college websites. */
export function tenantFromResponses(
  host: string,
  domain: DomainMapping | null,
  dashboard: Institute,
  profile: WebsiteProfile,
): TenantContext {
  const normalizedHost = host.trim().toLowerCase();
  const instituteId = mappedInstituteId(normalizedHost, domain);
  const admissionAdminIds = referenceIds(dashboard.admissionDepart);
  const eventManagerIds = referenceIds(dashboard.eventManagerDepart);
  return {
    host: normalizedHost,
    instituteId,
    admissionAdminId: admissionAdminIds[0],
    admissionAdminIds,
    financeId: referenceId(dashboard.financeDepart?.[0]),
    hostelId: referenceId(dashboard.hostelDepart?.[0]),
    alumniId: referenceId(dashboard.aluminiDepart?.[0]),
    libraryId: referenceId(dashboard.library?.[0]),
    eventManagerId: eventManagerIds[0],
    eventManagerIds,
    landingControlId: referenceId(profile.landing_control),
    iqacId: referenceId(dashboard.iqac_module?.[0]),
    dashboard,
    profile,
    domain: domain!,
  };
}

/** Resolves the tenant first, then fetches its independent dashboard and website profile together. */
export async function resolveTenant(client: CollegeClient, host: string): Promise<TenantContext> {
  const normalizedHost = host.trim().toLowerCase();
  if (!normalizedHost) throw new CollegeApiError('tenant', 'A college host is required to resolve the tenant.');
  const { all_domain: domain } = await client.institutes.byHost(normalizedHost);
  const instituteId = mappedInstituteId(normalizedHost, domain);
  const [{ institute: dashboard }, { one_ins: profile }] = await Promise.all([
    client.institutes.dashboard(instituteId),
    client.landing.profile(instituteId),
  ]);
  return tenantFromResponses(normalizedHost, domain, dashboard, profile);
}
