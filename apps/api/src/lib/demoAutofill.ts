/** Build a pre-filled Meridian Careers demo ATS URL (no browser required). */

export type DemoApplicant = {
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  workAuthStatus?: string | null;
  coverLetter?: string | null;
  currentTitle?: string | null;
  yearsExperience?: string | null;
  startDate?: string | null;
  relocation?: string | null;
  additionalInfo?: string | null;
  resumeFileName?: string | null;
};

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

export function demoApplicantFields(applicant: DemoApplicant): Record<string, string> {
  const { first, last } = splitName(applicant.name);
  const fields: Record<string, string> = {
    name: applicant.name,
    first_name: first,
    last_name: last,
    email: applicant.email,
  };
  const optional: Record<string, string | null | undefined> = {
    phone: applicant.phone,
    location: applicant.location,
    linkedin: applicant.linkedinUrl,
    portfolio: applicant.portfolioUrl,
    github: applicant.githubUrl,
    website: applicant.websiteUrl ?? applicant.portfolioUrl,
    work_auth: applicant.workAuthStatus,
    cover_letter: applicant.coverLetter,
    current_title: applicant.currentTitle,
    years_experience: applicant.yearsExperience,
    start_date: applicant.startDate,
    relocation: applicant.relocation,
    additional_info: applicant.additionalInfo,
    resume_filename: applicant.resumeFileName,
  };
  for (const [key, value] of Object.entries(optional)) {
    if (value?.trim()) fields[key] = value.trim();
  }
  return fields;
}

export function demoMissingFields(applicant: DemoApplicant): string[] {
  const missing: string[] = [];
  if (!applicant.name.trim()) missing.push("name");
  if (!applicant.email.trim()) missing.push("email");
  if (!applicant.phone?.trim()) missing.push("phone");
  if (!applicant.linkedinUrl?.trim()) missing.push("linkedin");
  if (!applicant.workAuthStatus?.trim()) missing.push("work_authorization");
  if (!applicant.resumeFileName?.trim()) missing.push("resume");
  return missing;
}

export function buildDemoReviewUrl(options: {
  formUrl: string;
  applicant: DemoApplicant;
  company?: string | null;
  roleTitle?: string | null;
  autoSubmit?: boolean;
}): string {
  const url = new URL(options.formUrl);
  const fields = demoApplicantFields(options.applicant);
  for (const [key, value] of Object.entries(fields)) {
    url.searchParams.set(key, value);
  }
  if (options.company) url.searchParams.set("company", options.company);
  if (options.roleTitle) url.searchParams.set("role", options.roleTitle);
  if (options.autoSubmit) url.searchParams.set("autosubmit", "1");
  return url.toString();
}
